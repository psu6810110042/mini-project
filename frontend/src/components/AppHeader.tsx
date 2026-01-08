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
    Drawer,
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
    MenuOutlined,
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
    const [drawerVisible, setDrawerVisible] = useState(false);

    const handleStartLiveSession = () => {
        const sessionId = nanoid(10);
        navigate(`/live/${sessionId}`, { state: { language: selectedLanguage } });
        setIsGoLiveModalVisible(false);
        setDrawerVisible(false); // Close drawer if open
    };

    const handleLogoClick = () => {
        if (onResetToCreateMode) {
            onResetToCreateMode();
        } else {
            navigate("/");
        }
        setDrawerVisible(false);
    };

    // Helper to render navigation items
    const renderNavItems = (isMobile = false) => {
        if (currentUser) {
            return (
                <>
                    {showLiveButton && (
                        <Button
                            icon={<WifiOutlined />}
                            onClick={() => setIsGoLiveModalVisible(true)}
                            block={isMobile}
                            style={isMobile ? { marginBottom: 8 } : {}}
                        >
                            Live Session
                        </Button>
                    )}
                    {currentUser.role === "ADMIN" && (
                        <Button
                            icon={<SafetyCertificateOutlined />}
                            onClick={() => {
                                navigate("/admin");
                                setDrawerVisible(false);
                            }}
                            block={isMobile}
                            style={isMobile ? { marginBottom: 8 } : {}}
                        >
                            Admin
                        </Button>
                    )}

                    {!isMobile && screens.md && (
                        <Text>
                            <UserOutlined /> {currentUser.username}
                        </Text>
                    )}

                    <Button
                        type={isMobile ? "primary" : "text"}
                        danger={isMobile}
                        icon={<LogoutOutlined />}
                        onClick={() => {
                            onLogout();
                            setDrawerVisible(false);
                        }}
                        block={isMobile}
                        style={isMobile ? { marginBottom: 8 } : {}}
                    >
                        Logout
                    </Button>
                </>
            );
        }

        return (
            <>
                <Button
                    type="default"
                    icon={<LoginOutlined />}
                    onClick={() => {
                        navigate("/login");
                        setDrawerVisible(false);
                    }}
                    block={isMobile}
                    style={isMobile ? { marginBottom: 8 } : {}}
                >
                    Login
                </Button>

                <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={() => {
                        navigate("/register");
                        setDrawerVisible(false);
                    }}
                    block={isMobile}
                    style={isMobile ? { marginBottom: 8 } : {}}
                >
                    Register
                </Button>
            </>
        );
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
                position: "sticky",
                top: 0,
                width: "100%",
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
                        display: screens.xs && !searchQuery ? "none" : "block", // Hide search on very small screens if empty or handle differently
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
                    {/* ... Search Results Card (same as before) ... */}
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

            {/* Desktop Navigation */}
            {screens.md ? (
                <Space>
                    {onResetToCreateMode && (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={onResetToCreateMode}
                        >
                            New Paste
                        </Button>
                    )}
                    {renderNavItems(false)}
                </Space>
            ) : (
                // Mobile Navigation (Hamburger)
                <>
                    <Button
                        icon={<MenuOutlined />}
                        type="text"
                        onClick={() => setDrawerVisible(true)}
                    />
                    <Drawer
                        title="Menu"
                        placement="right"
                        onClose={() => setDrawerVisible(false)}
                        open={drawerVisible}
                        zIndex={1002}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {currentUser && (
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                                    <Avatar style={{ backgroundColor: token.colorPrimary, marginRight: 8 }}>
                                        {currentUser.username[0].toUpperCase()}
                                    </Avatar>
                                    <Text strong>{currentUser.username}</Text>
                                </div>
                            )}

                            {onResetToCreateMode && (
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => {
                                        onResetToCreateMode();
                                        setDrawerVisible(false);
                                    }}
                                    block
                                >
                                    New Paste
                                </Button>
                            )}

                            {renderNavItems(true)}
                        </div>
                    </Drawer>
                </>
            )}

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
