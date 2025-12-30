import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// นำเข้า loginService จากไฟล์ที่เราเพิ่งแก้เมื่อกี้
import { loginService } from '../services/authService'; 

const LoginPage = () => {
  const navigate = useNavigate();

  // 1. เปลี่ยน State จาก email เป็น username
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // 2. Event Handler สำหรับ Username
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  // 3. ฟังก์ชัน Submit (เชื่อมต่อกับ Backend จริง)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // เคลียร์ error เก่าก่อน

    try {
      console.log('Logging in with:', username);

      // ✅ เรียก API จริง ผ่าน loginService
      const data = await loginService(username, password);
      
      console.log('Login Success:', data); // ดูใน Console ว่า data หน้าตาเป็นยังไง

      // ✅ 1. เก็บ Token ลง LocalStorage
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
      } else if (data.accessToken) {
        localStorage.setItem('token', data.accessToken);
      }

      // ✅ 2. เก็บข้อมูล User ลง LocalStorage (สำคัญมาก! Dashboard ต้องใช้)
      if (data.user) {
        // แปลง Object เป็น String ก่อนเก็บ
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        console.warn("⚠️ Backend ไม่ได้ส่งข้อมูล user กลับมา อาจทำให้ Dashboard แสดงผลผิดพลาด");
      }

      alert('เข้าสู่ระบบสำเร็จ!');
      navigate('/'); // เด้งไปหน้า Dashboard หรือหน้าแรก

    } catch (err: any) {
      // แสดง Error ที่ได้จาก Backend
      setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    }
  };

  return (
    <div className="login-container" style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center' }}>Login</h2>
      
      {/* แสดง Error message ถ้ามี */}
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          {/* ✅ เปลี่ยน Label และ Input เป็น Username */}
          <label>Username:</label>
          <input 
            type="text" 
            value={username} 
            onChange={handleUsernameChange} 
            required 
            placeholder="กรอกชื่อผู้ใช้"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Password:</label>
          <input 
            type="password" 
            value={password} 
            onChange={handlePasswordChange} 
            required 
            placeholder="กรอกรหัสผ่าน"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
          เข้าสู่ระบบ
        </button>
      </form>

      <p style={{ marginTop: '15px', textAlign: 'center', fontSize: '14px' }}>
        ยังไม่มีบัญชี?{' '}
        <span 
          onClick={() => navigate('/register')} 
          style={{ color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
        >
          สมัครสมาชิก
        </span>
      </p>
    </div>
  );
};

export default LoginPage;