import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, theme, Layout, Button } from "antd";
import { BulbOutlined, BulbFilled } from "@ant-design/icons";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";

function App() {
  // 1. Initialize State from LocalStorage (Fixes "Doesn't Save")
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem("isDarkMode");
    return savedMode === "true";
  });

  const { defaultAlgorithm, darkAlgorithm } = theme;

  // 2. Effect to handle Body Background & Persistence
  useEffect(() => {
    // Save to LocalStorage
    localStorage.setItem("isDarkMode", isDarkMode.toString());

    // Fix the "White Background" issue manually
    // Ant Design's dark mode uses #000000 for body and #141414 for components
    if (isDarkMode) {
      document.body.style.backgroundColor = "#000000";
      document.body.style.color = "#ffffff"; // Fixes text color outside components
    } else {
      document.body.style.backgroundColor = "#ffffff";
      document.body.style.color = "#000000";
    }
  }, [isDarkMode]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
        // Optional: Customize tokens if you want specific colors
        token: {
          colorPrimary: "#1890ff",
        },
      }}
    >
      {/* Make Layout transparent so it shows the body color we set above,
         OR let Layout handle the container background. 
         We set background: 'transparent' here to let the body color shine through.
      */}
      <Layout style={{ minHeight: "100vh", background: 'transparent' }}>
        
        {/* Toggle Button */}
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 1000 }}>
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
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

      </Layout>
    </ConfigProvider>
  );
}

export default App;