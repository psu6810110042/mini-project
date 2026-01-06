import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, Typography, Button, message, Spin, Tag } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { io, Socket } from "socket.io-client";
import Editor from "@monaco-editor/react";
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

    const editorRef = useRef(null);

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }
    }, []);

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
            (details: { ownerId: number | null }) => {
                if (currentUser && details.ownerId) {
                    const allowed =
                        currentUser.id === details.ownerId ||
                        currentUser.role === "ADMIN";
                    setIsAllowedToEdit(allowed);
                    if (!allowed) {
                        message.info("You are in view-only mode.");
                    }
                }
            },
        );

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
            setCode("// Disconnected from session. Please refresh.");
            setIsAllowedToEdit(false);
        });

        return () => {
            newSocket.emit("leave-session", sessionId);
            newSocket.disconnect();
        };
    }, [sessionId, navigate, currentUser]);

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            // We update the local state for a responsive feel.
            // The broadcast from the server will keep it in sync.
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

    function handleEditorDidMount(editor: any) {
        editorRef.current = editor;
    }

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Content style={{ padding: "24px" }}>
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
        </Layout>
    );
};

export default LiveSessionPage;
