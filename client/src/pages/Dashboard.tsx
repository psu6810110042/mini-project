import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Layout,
  Input,
  Button,
  Card,
  Row,
  Col,
  Select,
  Typography,
  Tag,
  message,
  Modal,
  Space,
  Alert,
  Divider,
  Avatar,
  Empty,
  theme,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  LogoutOutlined,
  LoginOutlined,
  UserOutlined,
  HeartOutlined,
  HeartFilled,
  EditOutlined,
  DeleteOutlined,
  GlobalOutlined,
  LockOutlined,
  CodeOutlined,
  FireOutlined,
  CloseCircleFilled,
  SafetyCertificateOutlined,
} from "@ant-design/icons";

import {
  getCodes,
  createCodeService,
  likeCodeService,
  deleteCodeService,
  updateCodeService,
} from "../services/codeService";
import type { CodeSnippet, User } from "../types";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  vs,
} from "react-syntax-highlighter/dist/esm/styles/prism";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

const Dashboard = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { token } = theme.useToken();

  const [codes, setCodes] = useState<CodeSnippet[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CodeSnippet[]>([]);

  const [titleInput, setTitleInput] = useState("");
  const [contentInput, setContentInput] = useState("");
  const [langInput, setLangInput] = useState("javascript");
  const [visibilityInput, setVisibilityInput] = useState<"PUBLIC" | "PRIVATE">(
    "PUBLIC",
  );
  const [tagsInput, setTagsInput] = useState("");

  const [selectedCode, setSelectedCode] = useState<CodeSnippet | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const storedUserStr = localStorage.getItem("user");
    if (storedUserStr) {
      try {
        setCurrentUser(JSON.parse(storedUserStr));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = codes.filter(
      (code) =>
        code.title.toLowerCase().includes(query) ||
        code.language.toLowerCase().includes(query) ||
        (code.tags &&
          code.tags.some((t) => t.name.toLowerCase().includes(query))),
    );
    setSearchResults(filtered);
  }, [searchQuery, codes]);

  const fetchData = async () => {
    try {
      const data = await getCodes();
      if (Array.isArray(data)) {
        setCodes(data);
        if (id) {
          const foundSnippet = data.find((code) => code.id === id);
          if (foundSnippet) handleSelectCode(foundSnippet);
        }
      }
    } catch (error) {
      console.error("Failed to fetch codes");
    } finally {
    }
  };

  const trendingCodes = React.useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return codes
      .filter((code) => {
        const created = new Date(code.createdAt);
        return code.visibility === "PUBLIC" && created > oneWeekAgo;
      })
      .sort((a, b) => {
        if (b.likes.length !== a.likes.length) {
          return b.likes.length - a.likes.length;
        }
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
      .slice(0, 5);
  }, [codes]);

  const handleLogout = () => {
    localStorage.clear();
    message.success("Logged out successfully");
    navigate("/dashboard");
  };

  const resetToCreateMode = () => {
    setSelectedCode(null);
    setIsEditing(false);
    setTitleInput("");
    setContentInput("");
    setLangInput("javascript");
    setVisibilityInput("PUBLIC");
    setTagsInput("");
    setSearchQuery("");
    navigate("/");
  };

  const startEditMode = () => {
    if (!selectedCode) return;
    setIsEditing(true);
    setTitleInput(selectedCode.title);
    setContentInput(selectedCode.content);
    setLangInput(selectedCode.language);
    setVisibilityInput(selectedCode.visibility);
    setTagsInput(
      selectedCode.tags ? selectedCode.tags.map((t) => t.name).join(", ") : "",
    );
  };

  const handleSelectCode = (code: CodeSnippet) => {
    setSelectedCode(code);
    setIsEditing(false);
    setSearchQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreate = async () => {
    if (!contentInput)
      return message.warning("Please enter some code content!");

    const titleToSend = currentUser ? titleInput || "Untitled" : "Untitled";
    const langToSend = currentUser ? langInput : "text";

    try {
      const tagsArray = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "");
      await createCodeService({
        title: titleToSend,
        content: contentInput,
        language: langToSend,
        visibility: visibilityInput,
        tags: tagsArray,
      });

      message.success("Paste created successfully!");
      resetToCreateMode();
      fetchData();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create paste";
      message.error(errorMessage);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCode) return;
    try {
      const tagsArray = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "");

      await updateCodeService(selectedCode.id, {
        title: titleInput,
        content: contentInput,
        language: langInput,
        visibility: visibilityInput,
        tags: tagsArray,
      });

      message.success("Paste updated!");
      const freshData = await getCodes();
      setCodes(freshData);
      const updatedItem = freshData.find((c) => c.id === selectedCode.id);
      if (updatedItem) setSelectedCode(updatedItem);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      message.error("Update failed");
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: "Are you sure?",
      content: "This action cannot be undone.",
      okText: "Yes, Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await deleteCodeService(id);
          message.success("Paste deleted");
          resetToCreateMode();
          fetchData();
        } catch (err) {
          message.error("Delete failed");
        }
      },
    });
  };

  const handleLike = async (id: string) => {
    if (!currentUser) return message.warning("Please login to like pastes");
    await likeCodeService(id);
    const updatedCodes = await getCodes();
    setCodes(updatedCodes);
    if (selectedCode?.id === id) {
      const updatedItem = updatedCodes.find((c) => c.id === id);
      if (updatedItem) setSelectedCode(updatedItem);
    }
  };

  const renderEditorOrView = () => {
    const isDarkMode =
      token.colorBgContainer === "#141414" || token.colorBgLayout === "#000000";

    if (selectedCode && !isEditing) {
      return (
        <Card
          style={{ height: "100%" }}
          title={
            <Space>
              <Title level={4} style={{ margin: 0 }}>
                {selectedCode.title}
              </Title>
              <Tag color="blue">{selectedCode.language}</Tag>
              {selectedCode.visibility === "PRIVATE" && (
                <Tag color="gold">Private</Tag>
              )}
            </Space>
          }
          extra={
            <Space>
              <Button
                type="text"
                icon={
                  currentUser &&
                  selectedCode.likes.some((u) => u.id === currentUser.id) ? (
                    <HeartFilled style={{ color: "red" }} />
                  ) : (
                    <HeartOutlined />
                  )
                }
                onClick={() => handleLike(selectedCode.id)}
              >
                {selectedCode.likes.length}
              </Button>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                By {selectedCode.author.username} •{" "}
                {new Date(selectedCode.createdAt).toLocaleDateString()}
              </Text>
            </Space>
          }
        >
          <SyntaxHighlighter
            language={
              selectedCode.language === "text" ? "text" : selectedCode.language
            }
            style={isDarkMode ? vscDarkPlus : vs}
            showLineNumbers={true}
            wrapLines={true}
            customStyle={{
              margin: 0,
              borderRadius: token.borderRadius,
              border: `1px solid ${token.colorBorder}`,
              fontSize: "14px",
              backgroundColor: isDarkMode ? "#1e1e1e" : "#f5f5f5",
            }}
            lineNumberStyle={{
              minWidth: "2.5em",
              paddingRight: "1em",
              color: isDarkMode ? "#6e7681" : "#bfbfbf",
              textAlign: "right",
            }}
          >
            {selectedCode.content}
          </SyntaxHighlighter>

          <div style={{ marginTop: 16 }}>
            {selectedCode.tags.map((tag) => (
              <Tag key={tag.id} color="geekblue">
                #{tag.name}
              </Tag>
            ))}
          </div>

          {(currentUser?.id === selectedCode.author.id ||
            currentUser?.role === "ADMIN") && (
            <>
              <Divider />
              <Space>
                <Button icon={<EditOutlined />} onClick={startEditMode}>
                  Edit
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(selectedCode.id)}
                >
                  Delete
                </Button>
              </Space>
            </>
          )}
        </Card>
      );
    }

    return (
      <Card
        title={isEditing ? "Edit Paste" : "New Paste"}
        variant={"outlined"}
        style={{ height: "100%" }}
      >
        <TextArea
          rows={20}
          placeholder="Paste your code here..."
          value={contentInput}
          onChange={(e) => setContentInput(e.target.value)}
          style={{
            fontFamily: "'Consolas', 'Monaco', monospace",
            fontSize: "14px",
            resize: "none",
            backgroundColor: token.colorFillQuaternary,
          }}
        />

        {currentUser ? (
          <div style={{ marginTop: 24 }}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Input
                  placeholder="Paste Title"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  prefix={<CodeOutlined />}
                />
              </Col>
              <Col span={12}>
                <Select
                  style={{ width: "100%" }}
                  value={langInput}
                  onChange={setLangInput}
                  options={[
                    { value: "javascript", label: "JavaScript" },
                    { value: "typescript", label: "TypeScript" },
                    { value: "python", label: "Python" },
                    { value: "html", label: "HTML" },
                    { value: "css", label: "CSS" },
                    { value: "text", label: "Plain Text" },
                  ]}
                />
              </Col>
              <Col span={12}>
                <Select
                  style={{ width: "100%" }}
                  value={visibilityInput}
                  onChange={setVisibilityInput}
                  options={[
                    {
                      value: "PUBLIC",
                      label: (
                        <span>
                          <GlobalOutlined /> Public
                        </span>
                      ),
                    },
                    {
                      value: "PRIVATE",
                      label: (
                        <span>
                          <LockOutlined /> Private
                        </span>
                      ),
                    },
                  ]}
                />
              </Col>
              <Col span={24}>
                <Input
                  placeholder="Tags (comma separated, e.g. react, api)"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </Col>
            </Row>

            <Divider />

            <Space>
              <Button
                type="primary"
                icon={isEditing ? <EditOutlined /> : <PlusOutlined />}
                onClick={isEditing ? handleUpdate : handleCreate}
                size="large"
              >
                {isEditing ? "Save Changes" : "Create New Paste"}
              </Button>

              {isEditing && (
                <Button size="large" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              )}
            </Space>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <label>Sign in to create snippet!</label>
          </div>
        )}
      </Card>
    );
  };

  return (
    <Layout style={{ minHeight: "100vh", background: token.colorBgLayout }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorder}`,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
          onClick={resetToCreateMode}
        >
          <Title level={3} style={{ margin: 0 }}>
            NESTBIN
          </Title>
        </div>

        <div
          style={{
            position: "relative",
            flex: 1,
            margin: "0 40px",
            maxWidth: "800px",
          }}
        >
          <Input
            prefix={
              <SearchOutlined style={{ color: token.colorTextPlaceholder }} />
            }
            placeholder="Search by Title, Language, or Tag..."
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
              bodyStyle={{ padding: 0 }}
            >
              <div
                style={{
                  padding: "8px 16px",
                  background: token.colorFillAlter,
                  borderBottom: `1px solid ${token.colorBorder}`,
                  display: "flex",
                  justifyContent: "space-between",
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
                <div style={{ maxHeight: "350px", overflowY: "auto" }}>
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
                        (e.currentTarget.style.background = "transparent")
                      }
                      onClick={() => {
                        handleSelectCode(item);
                        navigate(`/snippet/${item.id}`);
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
                          style={{ backgroundColor: token.colorPrimary }}
                          icon={<CodeOutlined />}
                        />
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <Text strong>{item.title || "Untitled"}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {item.language} •{" "}
                            {new Date(item.createdAt).toLocaleDateString()}
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

        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={resetToCreateMode}
          >
            New Paste
          </Button>
          {currentUser ? (
            <>
              {currentUser.role === "ADMIN" && (
                <Button
                  type="primary"
                  danger
                  icon={<SafetyCertificateOutlined />}
                  onClick={() => navigate("/admin")}
                >
                  Admin Panel
                </Button>
              )}
              <Text>
                <UserOutlined /> {currentUser.username}
              </Text>
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button
                type="default"
                icon={<LoginOutlined />}
                onClick={() => navigate("/login")}
              >
                Login
              </Button>
              <Button type="primary" onClick={() => navigate("/register")}>
                Register
              </Button>
            </>
          )}
        </Space>
      </Header>

      <Content style={{ padding: "24px", width: "100%" }}>
        <Row gutter={24}>
          <Col xs={24} md={18} lg={19}>
            {!currentUser && !selectedCode && (
              <Alert
                description="Sign up or Login to save your pastes privately and edit them later."
                type="info"
                showIcon
                closable
                style={{ marginBottom: 24 }}
                action={
                  <Space>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => navigate("/register")}
                    >
                      Sign Up
                    </Button>
                    <Button size="small" onClick={() => navigate("/login")}>
                      Login
                    </Button>
                  </Space>
                }
              />
            )}
            {renderEditorOrView()}
          </Col>

          <Col xs={24} md={6} lg={5}>
            <Card
              title={
                <span>
                  <FireOutlined style={{ color: "orange" }} /> Trending (Week)
                </span>
              }
              bodyStyle={{ padding: 0 }}
            >
              <div style={{ maxHeight: "80vh", overflowY: "auto" }}>
                {trendingCodes.length > 0 ? (
                  trendingCodes.map((item, index) => (
                    <div
                      key={item.id}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        background:
                          selectedCode?.id === item.id
                            ? token.colorPrimaryBg
                            : "transparent",
                        borderBottom: `1px solid ${token.colorSplit}`,
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        transition: "background 0.3s",
                      }}
                      onClick={() => {
                        handleSelectCode(item);
                        navigate(`/snippet/${item.id}`);
                      }}
                    >
                      <Avatar
                        size="small"
                        style={{
                          backgroundColor:
                            index === 0 ? "#ffbf00" : token.colorFillContent,
                          color: index === 0 ? "white" : token.colorText,
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </Avatar>

                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 4,
                          }}
                        >
                          <Text strong style={{ fontSize: 13 }} ellipsis>
                            {item.title || "Untitled"}
                          </Text>
                          <Space
                            size={4}
                            style={{
                              fontSize: 12,
                              color: token.colorTextSecondary,
                              flexShrink: 0,
                            }}
                          >
                            <HeartFilled
                              style={{ color: "red", fontSize: 10 }}
                            />
                            {item.likes.length}
                          </Space>
                        </div>
                        <Tag style={{ margin: 0, fontSize: 10 }}>
                          {item.language}
                        </Tag>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      padding: 20,
                      textAlign: "center",
                      color: token.colorTextDescription,
                    }}
                  >
                    No trending posts this week
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default Dashboard;
