import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, Typography, Alert, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { loginService } from "../services/authService";
import type { LoginFieldValues } from "../types";

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: LoginFieldValues) => {
    setLoading(true);
    setError(null);

    try {
      const data = await loginService(values.username, values.password);
      const token = data.access_token || data.accessToken;

      if (!token) {
        throw new Error("Invalid Login");
      }

      localStorage.setItem("token", token);
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      message.success("Login successful!");
      navigate("/");

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Invalid username or password";
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      <Card
        style={{ width: 400, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={2}>Welcome Back</Title>
          <Text type="secondary">Please login to your account</Text>
        </div>

        {error && (
          <Alert
            description={error}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          name="login_form"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: "Please input your Username!" }]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder="Username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please input your Password!" }]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="login-form-button"
              block
              loading={loading} 
            >
              Log in
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center" }}>
          <Text>Don't have an account? </Text>
          <a onClick={() => navigate("/register")} style={{ color: "#1890ff" }}>
            Register now!
          </a>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;