import { useEffect, useState } from "react";
import {
  Layout,
  Table,
  Button,
  Popconfirm,
  message,
  Tabs,
  Tag as AntTag,
  Card,
  Statistic,
  Row,
  Col,
  theme,
} from "antd";
import {
  DeleteOutlined,
  UserOutlined,
  CodeOutlined,
  TagsOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { User, CodeSnippet, Tag } from "../types";

// Import Services
import {
  getAllUsers,
  deleteUser,
  getAllTags,
  deleteTag,
} from "../services/adminService";
import { getCodes, deleteCodeService } from "../services/codeService";

const { Content } = Layout;

const AdminPanel = () => {
  const navigate = useNavigate();
  const { token } = theme.useToken();

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      navigate("/login");
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (user.role !== "ADMIN") {
        message.error("Access Denied: Admins Only");
        navigate("/");
      } else {
        fetchAllData();
      }
    } catch (e) {
      navigate("/login");
    }
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [usersData, snippetsData, tagsData] = await Promise.all([
        getAllUsers(),
        getCodes(),
        getAllTags(),
      ]);

      console.log("Tags Data Debug:", tagsData);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setSnippets(Array.isArray(snippetsData) ? snippetsData : []);
      setTags(Array.isArray(tagsData) ? tagsData : []);
    } catch (error) {
      console.error(error);
      message.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await deleteUser(id);
      message.success("User deleted");
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      message.error("Failed to delete user");
    }
  };

  const handleDeleteSnippet = async (id: string) => {
    try {
      await deleteCodeService(id);
      message.success("Snippet deleted");
      setSnippets((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      message.error("Failed to delete snippet");
    }
  };

  const handleDeleteTag = async (id: number) => {
    try {
      await deleteTag(id);
      message.success("Tag deleted");
      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      message.error("Failed to delete tag");
    }
  };

  const userColumns = [
    { title: "ID", dataIndex: "id", width: 80 },
    {
      title: "Username",
      dataIndex: "username",
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (role: string) => (
        <AntTag color={role === "ADMIN" ? "red" : "blue"}>{role}</AntTag>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, record: User) => (
        <Popconfirm
          title="Delete user?"
          onConfirm={() => handleDeleteUser(record.id)}
        >
          <Button danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const snippetColumns = [
    { title: "Title", dataIndex: "title", ellipsis: true },
    {
      title: "Author",
      dataIndex: ["author", "username"],
      render: (t: string) => <AntTag>{t}</AntTag>,
    },
    { title: "Lang", dataIndex: "language" },
    {
      title: "Visibility",
      dataIndex: "visibility",
      render: (v: string) => (
        <AntTag color={v === "PRIVATE" ? "gold" : "green"}>{v}</AntTag>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, record: CodeSnippet) => (
        <Popconfirm
          title="Delete snippet?"
          onConfirm={() => handleDeleteSnippet(record.id)}
        >
          <Button danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const tagColumns = [
    { title: "ID", dataIndex: "id", width: 80 },
    {
      title: "Name",
      dataIndex: "name",
      render: (t: string) => <AntTag color="geekblue">#{t}</AntTag>,
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, record: Tag) => (
        <Popconfirm
          title="Delete tag?"
          onConfirm={() => handleDeleteTag(record.id)}
        >
          <Button danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: token.colorBgLayout }}>
      <Content
        style={{
          padding: "50px",
          maxWidth: "1200px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h1 style={{ color: token.colorText }}>🛡️ Admin Panel</h1>
          <Button icon={<ReloadOutlined />} onClick={fetchAllData}>
            Refresh Data
          </Button>
        </div>

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            {/* FIX: Use styles={{ body: ... }} instead of bodyStyle */}
            <Card variant="borderless" styles={{ body: { padding: 20 } }}>
              <Statistic
                title="Total Users"
                value={users.length}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card variant="borderless" styles={{ body: { padding: 20 } }}>
              <Statistic
                title="Total Snippets"
                value={snippets.length}
                prefix={<CodeOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card variant="borderless" styles={{ body: { padding: 20 } }}>
              <Statistic
                title="Total Tags"
                value={tags.length}
                prefix={<TagsOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Management Tabs */}
        <Card>
          <Tabs
            defaultActiveKey="1"
            items={[
              {
                key: "1",
                label: (
                  <span>
                    <UserOutlined /> Users
                  </span>
                ),
                children: (
                  <Table
                    dataSource={users}
                    columns={userColumns}
                    rowKey="id"
                    loading={loading}
                  />
                ),
              },
              {
                key: "2",
                label: (
                  <span>
                    <CodeOutlined /> Snippets (God Mode)
                  </span>
                ),
                children: (
                  <Table
                    dataSource={snippets}
                    columns={snippetColumns}
                    rowKey="id"
                    loading={loading}
                  />
                ),
              },
              {
                key: "3",
                label: (
                  <span>
                    <TagsOutlined /> Tags
                  </span>
                ),
                children: (
                  <Table
                    dataSource={tags}
                    columns={tagColumns}
                    rowKey="id"
                    loading={loading}
                  />
                ),
              },
            ]}
          />
        </Card>

        <div style={{ marginTop: 20 }}>
          <Button onClick={() => navigate("/")}>Back to Dashboard</Button>
        </div>
      </Content>
    </Layout>
  );
};

export default AdminPanel;
