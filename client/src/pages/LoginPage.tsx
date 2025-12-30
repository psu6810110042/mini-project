import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, Typography, Alert, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { loginService } from "../services/authService";

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Ant Design handles state automatically, we receive 'values' here
  const onFinish = async (values: any) => {
    setLoading(true);
    setError(null);

    try {
      console.log("Logging in with:", values.username);

      // ✅ Call API
      const data = await loginService(values.username, values.password);
      console.log("Login Success:", data);

      // ✅ 1. Store Token
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
      } else if (data.accessToken) {
        localStorage.setItem("token", data.accessToken);
      }

      // ✅ 2. Store User Data
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        console.warn("⚠️ Backend user data missing");
      }

      // ✅ Success Feedback
      message.success("Login successful!");
      navigate("/");
      
    } catch (err: any) {
      // ✅ Error Feedback
      const errorMessage = err.message || "Login failed. Please try again.";
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
          <Title level={2}>Welcome Back</Title>
          <Text type="secondary">Please login to your account</Text>
        </div>

        {/* Show Error Alert if exists */}
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
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
          {/* Username Input */}
          <Form.Item
            name="username"
            rules={[{ required: true, message: "Please input your Username!" }]}
          >
            <Input 
              prefix={<UserOutlined className="site-form-item-icon" />} 
              placeholder="Username" 
            />
          </Form.Item>

          {/* Password Input */}
          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please input your Password!" }]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="Password"
            />
          </Form.Item>

          {/* Submit Button */}
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="login-form-button"
              block
              loading={loading} // Shows spinner while fetching
            >
              Log in
            </Button>
          </Form.Item>
        </Form>

        {/* Register Link */}
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