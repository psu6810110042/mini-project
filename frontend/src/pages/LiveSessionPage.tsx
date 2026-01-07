import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
    Layout,
    Typography,
    Button,
    message,
    Spin,
    Tag,
    List,
    Avatar,
    Switch,
    Space,
    Modal,
    Input,
    Select,
    Form
} from "antd";
import {
    CopyOutlined,
    UserOutlined,
    ArrowLeftOutlined,
    SaveOutlined,
    GlobalOutlined,
    LockOutlined
} from "@ant-design/icons";
import { io, Socket } from "socket.io-client";
import Editor from "@monaco-editor/react";
import AppHeader from "../components/AppHeader";
import type { User, CodeSnippet } from "../types";
import { createCodeService, updateCodeService } from "../services/codeService";

const { Content } = Layout;
const { Title } = Typography;

const LiveSessionPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [code, setCode] = useState<string>("// Connecting to session...");
    const codeRef = useRef<string>(code);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isAllowedToEdit, setIsAllowedToEdit] = useState(false);
    const [currentEditor, setCurrentEditor] = useState<string | null>(null);

    const [participants, setParticipants] = useState<User[]>([]);
    const [allowedUserIds, setAllowedUserIds] = useState<number[]>([]);
    const [sessionOwnerId, setSessionOwnerId] = useState<number | null>(null);

    const [isSaved, setIsSaved] = useState(false);
    const [savedSnippet, setSavedSnippet] = useState<CodeSnippet | null>(null);

    const location = useLocation();

    const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
    const [saveForm] = Form.useForm();

    const editorRef = useRef(null);

    const updateCode = (newCode: string) => {
        setCode(newCode);
        codeRef.current = newCode;
    };

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }
    }, []);

    // Load initial code/snippet from navigation state if available (Start from Dashboard)
    useEffect(() => {
        if (location.state?.snippet) {
            const snippet = location.state.snippet as CodeSnippet;
            setSavedSnippet(snippet);
            updateCode(snippet.content);
            // We also need to emit this code to the session if we are the owner/creator
            // But we might need to wait for socket connection.
            // Actually, if we are creating the session, handleJoinSession sets default code.
            // We should overwrite it.
            // Let's do it in the socket connect block or here if socket is ready?
            // Safer: Wait for socket to be ready and we are joined. 
            // BUT: simple way: set local code, and when we join, if we are owner, we can emit update.
        }
    }, [location.state]);

    useEffect(() => {
        if (savedSnippet) {
            saveForm.setFieldsValue({
                title: savedSnippet.title,
                visibility: savedSnippet.visibility,
                tags: savedSnippet.tags ? savedSnippet.tags.map((t: any) => t.name) : [],
            });
        }
    }, [savedSnippet, saveForm]);

    // Calculate permissions whenever currentUser or sessionOwnerId changes
    useEffect(() => {
        if (currentUser && sessionOwnerId !== null) {
            const isOwner = currentUser.id === sessionOwnerId;
            const isAdmin = currentUser.role === "ADMIN";
            const isGranted = allowedUserIds.includes(currentUser.id);

            const allowed = isOwner || isAdmin || isGranted;

            setIsAllowedToEdit(allowed);
        }
    }, [currentUser, sessionOwnerId, allowedUserIds]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            message.error("You must be logged in to join a live session.");
            navigate("/login");
            return;
        }

        const newSocket = io({
            transports: ["websocket"],
            auth: { token },
        });
        setSocket(newSocket);

        newSocket.on("connect", () => {
            console.log("Connected to WebSocket server");
            newSocket.emit("join-session", sessionId);

            // If we have initial code from a snippet and we are joining, 
            // we might want to push it. relying on local state 'code' is risky if it was default.
            // But 'code' state is updated in the useEffect above.
            // We need to verify if we are the owner before overwriting. 
            // We can't know if we are owner until 'session-details' or logic confirms it.
        });

        newSocket.on(
            "session-details",
            (details: { ownerId: number | null; allowedUserIds: number[]; currentCode?: string; isSaved?: boolean }) => {
                setSessionOwnerId(details.ownerId);
                setAllowedUserIds(details.allowedUserIds || []);

                // If we have an initial snippet (savedSnippet) AND we are the owner,
                // AND the server sent default code ("// Start coding..."),
                // we should probably overwrite it with our snippet code.
                // However, 'currentCode' from server might be meaningful if session existed.

                // Logic: If 'location.state.snippet' was present, we prefer that code initially.
                // BUT only if we are the one who started it (Owner).
                // And only if the session seems "fresh" (e.g. currentCode is default).
                // Or: simply if we are owner and have savedSnippet, we emit update to sync.

                // Let's handle 'currentCode' update carefully.
                // Let's handle 'currentCode' update carefully.
                if (details.currentCode && details.currentCode !== '// Start coding...') {
                    updateCode(details.currentCode);
                } else if (!details.currentCode || details.currentCode === '// Start coding...') {
                    // Server has default code.
                    if (location.state?.snippet) {
                        // We have snippet code in 'code' state already from useEffect.
                        // Do NOT overwrite 'code' with default.
                        // AND emit update to server so others see it.
                        if (details.ownerId === currentUser?.id) { // Wait, currentUser might not be set yet? No, it is.
                            // Actually better to check if we are the owner based on details.
                            // But we need to use the socket we just created.
                            // We'll trust that 'code' has the snippet content.
                            newSocket.emit("code-update", { sessionId, code: codeRef.current });
                        }
                    } else if (details.currentCode) {
                        updateCode(details.currentCode);
                    }
                }

                if (details.isSaved) {
                    setIsSaved(true);
                }
            },
        );

        newSocket.on("participants-update", (users: User[]) => {
            setParticipants(users);
        });

        newSocket.on("permissions-update", (ids: number[]) => {
            setAllowedUserIds(ids);
        });

        newSocket.on("session-saved-update", (saved: boolean) => {
            setIsSaved(saved);
        });

        newSocket.on(
            "code-updated",
            (data: { code: string; editor: string }) => {
                if (data.editor !== currentUser?.username) {
                    updateCode(data.code);
                    setCurrentEditor(data.editor);
                }
            },
        );

        newSocket.on("auth-error", (errorMsg: string) => {
            message.error(errorMsg);
        });

        newSocket.on("disconnect", () => {
            console.log("Disconnected from WebSocket server.");
            // setCode("// Disconnected from session. Please refresh."); // Don't wipe code on momentary disconnect
            setIsAllowedToEdit(false);
        });

        return () => {
            newSocket.emit("leave-session", sessionId);
            newSocket.disconnect();
        };
    }, [sessionId, navigate]);

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            updateCode(value);
            if (isAllowedToEdit) {
                socket?.emit("code-update", { sessionId, code: value });
            }
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        message.success("Session link copied to clipboard!");
    };

    const togglePermission = (userId: number, grant: boolean) => {
        if (!socket) return;
        if (grant) {
            socket.emit("grant-permission", { sessionId, userId });
        } else {
            socket.emit("revoke-permission", { sessionId, userId });
        }
    };

    function handleEditorDidMount(editor: any) {
        editorRef.current = editor;
    }

    const handleSaveToDashboard = async (values: any) => {
        try {
            if (savedSnippet) {
                await updateCodeService(savedSnippet.id, {
                    title: values.title,
                    content: code,
                    language: "javascript",
                    visibility: values.visibility,
                    tags: values.tags || [],
                });
                message.success("Snippet updated successfully!");
                setSavedSnippet({
                    ...savedSnippet,
                    title: values.title,
                    content: code,
                    visibility: values.visibility,
                    tags: (values.tags || []).map((t: string) => ({ id: Math.random().toString(), name: t }))
                } as CodeSnippet);
            } else {
                const newSnippet = await createCodeService({
                    title: values.title,
                    content: code,
                    language: "javascript",
                    visibility: values.visibility,
                    tags: values.tags || [],
                });
                setSavedSnippet(newSnippet);
                message.success("Saved to your dashboard!");

                // Mark session as saved for everyone
                socket?.emit("mark-session-saved", sessionId);
            }

            setIsSaveModalVisible(false);
            // saveForm.resetFields(); 
        } catch (error) {
            message.error("Failed to save snippet.");
        }
    };

    const { Sider } = Layout;

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <AppHeader
                currentUser={currentUser}
                onLogout={() => {
                    localStorage.clear();
                    navigate("/dashboard");
                }}
                showLiveButton={false}
                showSearch={false}
            />
            <Layout>
                <Content style={{ padding: "24px", display: 'flex', flexDirection: 'column' }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "16px",
                        }}
                    >
                        <Space>
                            <Button
                                icon={<ArrowLeftOutlined />}
                                onClick={() => navigate("/dashboard")}
                            >
                                Back to Dashboard
                            </Button>
                            <Title level={4} style={{ margin: 0 }}>
                                Session: <Typography.Text code>{sessionId}</Typography.Text>
                            </Title>
                            {currentEditor && (
                                <Tag color="blue" style={{ marginLeft: 8 }}>
                                    Editing: {currentEditor}
                                </Tag>
                            )}
                            {isSaved && <Tag color="success">Saved to Dashboard</Tag>}
                        </Space>
                        <Space>
                            <Button icon={<CopyOutlined />} onClick={handleCopyLink}>
                                Copy Link
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={() => setIsSaveModalVisible(true)}
                                disabled={!currentUser || !isAllowedToEdit}
                                title={!isAllowedToEdit ? "Only editors can save" : (savedSnippet ? "Update Snippet" : "Save to Dashboard")}
                            >
                                {savedSnippet ? "Update Snippet" : (isSaved ? "Save Copy" : "Save to Dashboard")}
                            </Button>
                        </Space>
                    </div>

                    <Editor
                        height="80vh"
                        language="javascript"
                        theme="vs-dark"
                        value={code}
                        onChange={handleEditorChange}
                        onMount={handleEditorDidMount}
                        loading={<Spin />}
                        options={{ readOnly: !isAllowedToEdit }}
                    />
                </Content>
                <Sider width={300} theme="light" style={{ borderLeft: '1px solid #f0f0f0', padding: '16px' }}>
                    <Title level={4}>Participants</Title>
                    <List
                        itemLayout="horizontal"
                        dataSource={participants}
                        renderItem={(user) => {
                            const isOwner = user.id === sessionOwnerId;
                            const hasPermission = allowedUserIds.includes(user.id);
                            const canManage = currentUser?.id === sessionOwnerId && !isOwner;

                            return (
                                <List.Item
                                    actions={canManage ? [
                                        <Switch
                                            size="small"
                                            checked={hasPermission}
                                            onChange={(checked) => togglePermission(user.id, checked)}
                                        />
                                    ] : []}
                                >
                                    <List.Item.Meta
                                        avatar={<Avatar style={{ backgroundColor: '#87d068' }} icon={<UserOutlined />} />}
                                        title={
                                            <Space>
                                                {user.username}
                                                {isOwner && <Tag color="gold">Owner</Tag>}
                                                {user.id === currentUser?.id && <Tag color="blue">You</Tag>}
                                            </Space>
                                        }
                                        description={isOwner ? "Owner" : (hasPermission ? "Can Edit" : "View Only")}
                                    />
                                </List.Item>
                            );
                        }}
                    />
                </Sider>
            </Layout>

            <Modal
                title={savedSnippet ? "Update Snippet" : "Save Snippet to Dashboard"}
                open={isSaveModalVisible}
                onCancel={() => setIsSaveModalVisible(false)}
                footer={null}
            >
                <Form
                    form={saveForm}
                    onFinish={handleSaveToDashboard}
                    initialValues={{ visibility: "PUBLIC", title: `Session ${sessionId}` }}
                    layout="vertical"
                >
                    <Form.Item
                        name="title"
                        label="Title"
                        rules={[{ required: true, message: "Please enter a title" }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="visibility"
                        label="Visibility"
                    >
                        <Select>
                            <Select.Option value="PUBLIC"><GlobalOutlined /> Public</Select.Option>
                            <Select.Option value="PRIVATE"><LockOutlined /> Private</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="tags"
                        label="Tags"
                        tooltip="Type and press enter to add tags"
                    >
                        <Select mode="tags" placeholder="Add tags..." tokenSeparators={[',']} />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>
                            {savedSnippet ? "Update" : "Save"}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
};

export default LiveSessionPage;
