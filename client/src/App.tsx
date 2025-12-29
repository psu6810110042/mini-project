import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/DashBoard';


function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} /> {/* เพิ่มบรรทัดนี้ */}
    </Routes>
  )
}

export default App