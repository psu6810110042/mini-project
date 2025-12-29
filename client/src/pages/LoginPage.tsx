import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthResponse } from '../types';


const LoginPage = () => {
  const navigate = useNavigate();

  // 1. Strict State Typing
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // 2. Strict Event Typing: สำหรับ Input (ChangeEvent)
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  // 3. Strict Event Typing: สำหรับ Form Submit (FormEvent)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // --- จำลอง API Call (Mock) ---
      console.log('Logging in with:', email, password);
      
      // สมมติ Backend ส่งข้อมูลกลับมาแบบนี้ (ตาม Interface AuthResponse)
      const mockResponse: AuthResponse= {
        accessToken: "mock-jwt-token-123456",
        user: {
          uid: "admin1",
          email: email,
          role: "admin", // หรือลองเปลี่ยนเป็น 'admin' เพื่อเทส
          lastOnline: new Date().toISOString()
        }
      };

      // --- 4. Logic เก็บ JWT ลง Local Storage (ตามโจทย์) ---
      localStorage.setItem('token', mockResponse.accessToken);
      // เก็บ User ไว้ด้วยเพื่อเอาไปเช็ค Role (User/Admin)
      localStorage.setItem('user', JSON.stringify(mockResponse.user));

      navigate('/dashboard');
      
      // Redirect ตาม Role (Logic เบื้องต้น)
      if (mockResponse.user.role === 'admin') {
         // navigate('/admin'); // (ถ้ามีหน้า Admin)
         console.log("Go to Admin View");
      } else {
         // navigate('/dashboard'); // (ไปหน้า User View)
         console.log("Go to User View");
      }

    } catch (error) {
      alert('Login ผิดพลาด');
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input 
            type="email" 
            value={email} 
            onChange={handleEmailChange} // ✅ Type ถูกต้อง
            required 
          />
        </div>
        <div>
          <label>Password:</label>
          <input 
            type="password" 
            value={password} 
            onChange={handlePasswordChange} // ✅ Type ถูกต้อง
            required 
          />
        </div>
        <button type="submit">เข้าสู่ระบบ</button>
      </form>
    </div>
  );
};

export default LoginPage;