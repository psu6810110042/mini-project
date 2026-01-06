import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, Typography, Button, message, Spin, Tag, List, Avatar, Switch, Space } from "antd";
import { CopyOutlined, UserOutlined } from "@ant-design/icons";
import { io, Socket } from "socket.io-client";
import Editor from "@monaco-editor/react";
import AppHeader from "../components/AppHeader";
import type { User } from "../types";

const { Content } = Layout;
const { Title } = Typography;

const LiveSessionPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [code, setCode] = useState<string>("// Connecting to session...");
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isAllowedToEdit, setIsAllowedToEdit] = useState(false);
    const [currentEditor, setCurrentEditor] = useState<string | null>(null);

    const [participants, setParticipants] = useState<User[]>([]);
    const [allowedUserIds, setAllowedUserIds] = useState<number[]>([]);
    const [sessionOwnerId, setSessionOwnerId] = useState<number | null>(null);

    const editorRef = useRef(null);

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }
    }, []);

    // Calculate permissions whenever currentUser or sessionOwnerId changes
    useEffect(() => {
        if (currentUser && sessionOwnerId !== null) {
            const isOwner = currentUser.id === sessionOwnerId;
            const isAdmin = currentUser.role === "ADMIN";
            const isGranted = allowedUserIds.includes(currentUser.id);

            const allowed = isOwner || isAdmin || isGranted;

            setIsAllowedToEdit(allowed);
            if (!allowed) {
                // message.info("You are in view-only mode."); 
                // Don't spam message on every render/update, maybe logic needs refinement
            }
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
        });

        newSocket.on(
            "session-details",
            (details: { ownerId: number | null; allowedUserIds: number[]; currentCode?: string }) => {
                setSessionOwnerId(details.ownerId);
                setAllowedUserIds(details.allowedUserIds || []);
                if (details.currentCode) {
                    setCode(details.currentCode);
                }
            },
        );

        newSocket.on("participants-update", (users: User[]) => {
            setParticipants(users);
        });

        newSocket.on("permissions-update", (ids: number[]) => {
            setAllowedUserIds(ids);
        });

        newSocket.on(
            "code-updated",
            (data: { code: string; editor: string }) => {
                setCode(data.code);
                setCurrentEditor(data.editor);
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
    }, [sessionId, navigate]); // Removed currentUser to prevent re-connections

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            setCode(value);
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

    const { Sider } = Layout;

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <AppHeader
                currentUser={currentUser}
                onLogout={() => {
                    localStorage.clear();
                    navigate("/dashboard");
                }}
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
                        <Title level={3} style={{ margin: 0 }}>
                            Live Code Session:{" "}
                            <Typography.Text code>{sessionId}</Typography.Text>
                            {currentEditor && (
                                <Tag color="blue" style={{ marginLeft: 8 }}>
                                    Editing: {currentEditor}
                                </Tag>
                            )}
                        </Title>
                        <Button icon={<CopyOutlined />} onClick={handleCopyLink}>
                            Copy Link
                        </Button>
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
        </Layout>
    );
};

export default LiveSessionPage;
