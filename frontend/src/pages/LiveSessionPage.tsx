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
import { createCodeService, updateCodeService, getCodeById } from "../services/codeService";

// ... existing imports

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

    const [snippetId, setSnippetId] = useState<string | null>(null);
    const [language, setLanguage] = useState<string>("javascript");

    // Fetch snippet details if we are working on a shared snippet
    useEffect(() => {
        const fetchSnippet = async () => {
            if (snippetId) {
                // If we don't have a snippet, OR if the current one is missing detailed fields (like tags)
                // we should fetch the full details.
                if (!savedSnippet || !savedSnippet.tags) {
                    const snippet = await getCodeById(snippetId);
                    if (snippet) {
                        setSavedSnippet(snippet);
                    }
                }
            }
        };
        fetchSnippet();
    }, [snippetId, savedSnippet]);


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
            // Prioritize snippet language if provided (starting from snippet), else explicit language (Go Live modal)
            const language = location.state?.snippet?.language || location.state?.language;
            newSocket.emit("join-session", { sessionId, language });
        });

        newSocket.on(
            "session-details",
            (details: { ownerId: number | null; allowedUserIds: number[]; currentCode?: string; isSaved?: boolean; snippetId?: string; snippetTitle?: string }) => {
                setSessionOwnerId(details.ownerId);
                setAllowedUserIds(details.allowedUserIds || []);
                if (details.snippetId) {
                    setSnippetId(details.snippetId);
                }

                // Only properly initialize savedSnippet if we actually have a snippetId (linked to DB)
                if (details.snippetId && details.snippetTitle && (!savedSnippet || savedSnippet.title !== details.snippetTitle)) {
                    setSavedSnippet(prev => ({
                        ...(prev || {
                            id: details.snippetId!,
                            content: details.currentCode || '',
                            language: details.language || 'javascript',
                            visibility: 'PUBLIC',
                            tags: []
                        }),
                        id: details.snippetId!,
                        title: details.snippetTitle!,
                        // If backend sends language, update it. Otherwise keep existing or default.
                        language: details.language || (prev?.language || 'javascript')
                    } as CodeSnippet));
                }

                if (details.language) {
                    setLanguage(details.language);
                }

                if (details.currentCode && details.currentCode !== '// Start coding...') {
                    updateCode(details.currentCode);
                } else if (!details.currentCode || details.currentCode === '// Start coding...') {
                    // Server has default code.
                    if (location.state?.snippet) {
                        // If we are owner and have a snippet, identify it to the server
                        // We check ownerId match slightly later or assume trusted start flow
                        // But here we can emit if we are the one who started it.
                        // Ideally checking if (details.ownerId === currentUser.id) but currentUser might be async.
                        // Safer to check permission or just emit. Server validates owner.
                        if (location.state.snippet.id) {
                            const snippetTitle = location.state.snippet.title;
                            // Only send title if it's not empty/untitled, otherwise let backend keep default "Session [ID]"
                            const titleToSend = (snippetTitle && snippetTitle !== "Untitled") ? snippetTitle : undefined;

                            newSocket.emit("identify-snippet", {
                                sessionId,
                                snippetId: location.state.snippet.id,
                                title: titleToSend
                            });
                        }

                        newSocket.emit("code-update", { sessionId, code: codeRef.current });
                    } else if (details.currentCode) {
                        updateCode(details.currentCode);
                    }
                }

                if (details.isSaved) {
                    setIsSaved(true);
                }
            },
        );

        newSocket.on("session-details-update", (data: { snippetId?: string; snippetTitle?: string }) => {
            if (data.snippetId) {
                setSnippetId(data.snippetId);
            }
            if (data.snippetTitle) {
                setSavedSnippet(prev => ({
                    ...(prev || {
                        id: data.snippetId!,
                        content: codeRef.current,
                        language: 'javascript',
                        visibility: 'PUBLIC',
                        tags: []
                    }),
                    id: data.snippetId!,
                    title: data.snippetTitle!
                } as CodeSnippet));
            }
        });

        newSocket.on("participants-update", (users: User[]) => {
            setParticipants(users);
        });

        newSocket.on("permissions-update", (ids: number[]) => {
            setAllowedUserIds(ids);
        });

        newSocket.on("session-saved-update", (saved: boolean) => {
            setIsSaved(saved);
        });

        newSocket.on("snippet-saved", (data: { updater: string; timestamp: string }) => {
            message.success(`Snippet updated by ${data.updater}`);
            setIsSaved(true);
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
            // Priority: Shared Snippet Update via Socket
            if (snippetId) {
                socket?.emit("save-snippet", {
                    sessionId,
                    updateDto: {
                        title: values.title,
                        content: code,
                        language: language,
                        visibility: values.visibility,
                        tags: values.tags || [],
                    }
                });
                // Optimistic update or wait for 'snippet-saved' event
                // We rely on event for confirmation to avoid double messages
                // message.loading("Updating shared snippet..."); 
            }
            // Fallback: Personal Snippet Update or Create
            else if (savedSnippet) {
                await updateCodeService(savedSnippet.id, {
                    title: values.title,
                    content: code,
                    language: language,
                    visibility: values.visibility,
                    tags: values.tags || [],
                    isShared: undefined // Ensure type compatibility if isShared is extra
                });
                message.success("Snippet updated successfully!");
                setSavedSnippet({
                    ...savedSnippet,
                    title: values.title,
                    content: code,
                    language: language,
                    visibility: values.visibility,
                    tags: (values.tags || []).map((t: string) => ({ id: Math.random().toString(), name: t }))
                } as CodeSnippet);
            } else {
                const newSnippet = await createCodeService({
                    title: values.title,
                    content: code,
                    language: language,
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
                            <Select
                                style={{ width: 120 }}
                                value={language}
                                onChange={(val) => {
                                    // Optimistic update
                                    setLanguage(val);
                                    socket?.emit("language-update", { sessionId, language: val });
                                }}
                                disabled={!isAllowedToEdit}
                                options={[
                                    { value: "javascript", label: "JavaScript" },
                                    { value: "typescript", label: "TypeScript" },
                                    { value: "python", label: "Python" },
                                    { value: "html", label: "HTML" },
                                    { value: "css", label: "CSS" },
                                    { value: "text", label: "Plain Text" },
                                ]}
                            />
                            <Button icon={<CopyOutlined />} onClick={handleCopyLink}>
                                Copy Link
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={() => setIsSaveModalVisible(true)}
                                disabled={!currentUser || !isAllowedToEdit}
                                title={!isAllowedToEdit ? "Only editors can save" : (snippetId ? "Update Shared Snippet" : (savedSnippet ? "Update Snippet" : "Save to Dashboard"))}
                            >
                                {snippetId ? "Update Shared Snippet" : (savedSnippet ? "Update Snippet" : (isSaved ? "Save Copy" : "Save to Dashboard"))}
                            </Button>
                        </Space>
                    </div>

                    <Editor
                        height="80vh"
                        language={language}
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
                title={snippetId ? "Update Shared Snippet" : (savedSnippet ? "Update Snippet" : "Save Snippet to Dashboard")}
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
                            {snippetId || savedSnippet ? "Update" : "Save"}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    );
};

export default LiveSessionPage;
