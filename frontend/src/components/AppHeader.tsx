import React, { useState } from "react";
import {
    Layout,
    Input,
    Button,
    Typography,
    Space,
    Card,
    Empty,
    Avatar,
    Tag,
    Grid,
    theme,
    Modal,
    Select,
} from "antd";
import {
    SearchOutlined,
    PlusOutlined,
    LogoutOutlined,
    LoginOutlined,
    UserOutlined,
    WifiOutlined,
    SafetyCertificateOutlined,
    CloseCircleFilled,
    CodeOutlined,
    UserAddOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
import type { CodeSnippet, User } from "../types";

const { Header } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface AppHeaderProps {
    currentUser: User | null;
    onLogout: () => void;
    onResetToCreateMode?: () => void;
    searchQuery?: string;
    setSearchQuery?: (val: string) => void;
    searchResults?: CodeSnippet[];
    onSelectCode?: (code: CodeSnippet) => void;
    showSearch?: boolean;
    showLiveButton?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({
    currentUser,
    onLogout,
    onResetToCreateMode,
    searchQuery = "",
    setSearchQuery,
    searchResults = [],
    onSelectCode,
    showSearch = true,
    showLiveButton = true,
}) => {
    const navigate = useNavigate();
    const { token } = theme.useToken();
    const screens = useBreakpoint();

    const [isGoLiveModalVisible, setIsGoLiveModalVisible] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState("javascript");

    const handleStartLiveSession = () => {
        const sessionId = nanoid(10);
        navigate(`/live/${sessionId}`, { state: { language: selectedLanguage } });
        setIsGoLiveModalVisible(false);
    };

    const handleLogoClick = () => {
        if (onResetToCreateMode) {
            onResetToCreateMode();
        } else {
            navigate("/");
        }
    };

    return (
        <Header
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: `0 ${screens.md ? "24px" : "16px"}`,
                background: token.colorBgContainer,
                borderBottom: `1px solid ${token.colorBorder}`,
                zIndex: 1001,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                }}
                onClick={handleLogoClick}
            >
                <Title level={3} style={{ margin: 0 }}>
                    NESTBIN
                </Title>
            </div>

            {showSearch && setSearchQuery && (
                <div
                    style={{
                        position: "relative",
                        flex: 1,
                        margin: `0 ${screens.md ? "40px" : "16px"}`,
                        maxWidth: "800px",
                    }}
                >
                    <Input
                        prefix={
                            <SearchOutlined
                                style={{ color: token.colorTextPlaceholder }}
                            />
                        }
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        allowClear
                        style={{ width: "100%" }}
                    />
                    {searchQuery && (
                        <Card
                            style={{
                                position: "absolute",
                                top: "100%",
                                width: "100%",
                                zIndex: 1000,
                                boxShadow: token.boxShadowSecondary,
                                maxHeight: "400px",
                                borderRadius: "8px",
                                background: token.colorBgElevated,
                            }}
                            styles={{ body: { padding: 0 } }}
                        >
                            <div
                                style={{
                                    padding: "8px 16px",
                                    background: token.colorFillAlter,
                                    borderBottom: `1px solid ${token.colorBorder}`,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Found {searchResults.length} results
                                </Text>
                                <CloseCircleFilled
                                    onClick={() => setSearchQuery("")}
                                    style={{
                                        cursor: "pointer",
                                        color: token.colorTextDescription,
                                    }}
                                />
                            </div>

                            {searchResults.length === 0 ? (
                                <Empty
                                    description="No matching pastes found"
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    style={{ padding: 20 }}
                                />
                            ) : (
                                <div
                                    style={{
                                        maxHeight: "350px",
                                        overflowY: "auto",
                                    }}
                                >
                                    {searchResults.map((item) => (
                                        <div
                                            key={item.id}
                                            style={{
                                                padding: "10px 16px",
                                                cursor: "pointer",
                                                borderBottom: `1px solid ${token.colorSplit}`,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                            }}
                                            onMouseEnter={(e) =>
                                            (e.currentTarget.style.background =
                                                token.colorFillTertiary)
                                            }
                                            onMouseLeave={(e) =>
                                            (e.currentTarget.style.background =
                                                "transparent")
                                            }
                                            onClick={() => {
                                                if (onSelectCode) {
                                                    onSelectCode(item);
                                                }
                                                navigate(`/snippet/${item.id}`);
                                                setSearchQuery("");
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 12,
                                                }}
                                            >
                                                <Avatar
                                                    size="small"
                                                    style={{
                                                        backgroundColor:
                                                            token.colorPrimary,
                                                    }}
                                                    icon={<CodeOutlined />}
                                                />
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                    }}
                                                >
                                                    <Text strong>
                                                        {item.title ||
                                                            "Untitled"}
                                                    </Text>
                                                    <Text
                                                        type="secondary"
                                                        style={{ fontSize: 12 }}
                                                    >
                                                        {item.language} •{" "}
                                                        {new Date(
                                                            item.createdAt,
                                                        ).toLocaleDateString()}
                                                    </Text>
                                                </div>
                                            </div>
                                            {item.visibility === "PRIVATE" && (
                                                <Tag color="gold">Private</Tag>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    )}
                </div>
            )}

            {!showSearch && <div style={{ flex: 1 }} />}

            <Space>
                {onResetToCreateMode && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={onResetToCreateMode}
                    >
                        {screens.md && "New Paste"}
                    </Button>
                )}

                {currentUser ? (
                    <Space>
                        {showLiveButton && (
                            <Button
                                icon={<WifiOutlined />}
                                onClick={() => setIsGoLiveModalVisible(true)}
                            >
                                {screens.md && "Live Session"}
                            </Button>
                        )}
                        {currentUser.role === "ADMIN" && (
                            <Button
                                icon={<SafetyCertificateOutlined />}
                                onClick={() => navigate("/admin")}
                            >
                                {screens.md && "Admin"}
                            </Button>
                        )}

                        {screens.md && (
                            <Text>
                                <UserOutlined /> {currentUser.username}
                            </Text>
                        )}

                        <Button
                            type="text"
                            icon={<LogoutOutlined />}
                            onClick={onLogout}
                        >
                            {screens.md && "Logout"}
                        </Button>
                    </Space>
                ) : (
                    <Space>
                        <Button
                            type="default"
                            icon={<LoginOutlined />}
                            onClick={() => navigate("/login")}
                        >
                            {screens.sm && "Login"}
                        </Button>

                        <Button
                            type="primary"
                            icon={<UserAddOutlined />}
                            onClick={() => navigate("/register")}
                        >
                            {screens.sm && "Register"}
                        </Button>
                    </Space>
                )}
            </Space>

            <Modal
                title="Start Live Session"
                open={isGoLiveModalVisible}
                onCancel={() => setIsGoLiveModalVisible(false)}
                onOk={handleStartLiveSession}
                okText="Start Session"
                okButtonProps={{ icon: <WifiOutlined /> }}
            >
                <div style={{ padding: "20px 0" }}>
                    <Text strong>Select Language:</Text>
                    <Select
                        style={{ width: "100%", marginTop: "8px" }}
                        value={selectedLanguage}
                        onChange={setSelectedLanguage}
                        options={[
                            { value: "javascript", label: "JavaScript" },
                            { value: "typescript", label: "TypeScript" },
                            { value: "python", label: "Python" },
                            { value: "html", label: "HTML" },
                            { value: "css", label: "CSS" },
                            { value: "text", label: "Plain Text" },
                        ]}
                    />
                </div>
            </Modal>
        </Header>
    );
};

export default AppHeader;
