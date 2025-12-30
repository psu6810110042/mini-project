import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, Typography, Alert, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { registerService } from "../services/authService";
import type { RegisterFieldValues } from "../types";

const { Title, Text } = Typography;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: RegisterFieldValues) => {
    setLoading(true);
    setError(null);

    try {
      await registerService(values.username, values.password);

      message.success("Registration successful! Please login.");
      navigate("/login");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.";
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
        bordered={false}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={2}>Create Account</Title>
          <Text type="secondary">Join us to share your snippets</Text>
        </div>

        {error && (
          <Alert
            message="Registration Failed"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          name="register_form"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          scrollToFirstError
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: "Please input your Username!" },
              { min: 3, message: "Username must be at least 3 characters" },
            ]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder="Username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: "Please input your password!" },
              { min: 6, message: "Password must be at least 6 characters" },
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item
            name="confirm"
            dependencies={["password"]}
            hasFeedback
            rules={[
              { required: true, message: "Please confirm your password!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("The two passwords do not match!"),
                  );
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="Confirm Password"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Register
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center" }}>
          <Text>Already have an account? </Text>
          <a onClick={() => navigate("/login")} style={{ color: "#1890ff" }}>
            Login here
          </a>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;
