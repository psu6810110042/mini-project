import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Routes>
      {/* ✅ แก้ตรงนี้: ถ้าเข้าหน้าแรก (/) ให้ไป Dashboard */}
      <Route path="/" element={<Dashboard />} />
      
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* (แถม) ถ้าพิมพ์ URL มั่วๆ ให้เด้งกลับมา Login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
export default App;