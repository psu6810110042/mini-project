import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, theme, Layout, Button } from "antd";
import { BulbOutlined, BulbFilled } from "@ant-design/icons";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem("isDarkMode");
    return savedMode === "true";
  });

  const { defaultAlgorithm, darkAlgorithm } = theme;

  useEffect(() => {
    localStorage.setItem("isDarkMode", isDarkMode.toString());

    if (isDarkMode) {
      document.body.style.backgroundColor = "#000000";
      document.body.style.color = "#ffffff";
    } else {
      document.body.style.backgroundColor = "#ffffff";
      document.body.style.color = "#000000";
    }
  }, [isDarkMode]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
        token: {
          colorPrimary: "#1890ff",
        },
      }}
    >
      <Layout style={{ minHeight: "100vh", background: "transparent" }}>
        <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 1000 }}>
          <Button
            shape="circle"
            icon={isDarkMode ? <BulbFilled /> : <BulbOutlined />}
            onClick={() => setIsDarkMode(!isDarkMode)}
            size="large"
          />
        </div>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/snippet/:id" element={<Dashboard />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
