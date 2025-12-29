import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerService } from '../services/authService';

const RegisterPage = () => {
  const navigate = useNavigate();

  // 1. เปลี่ยนชื่อ State จาก email เป็น username
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    try {
      // 2. เรียก Service โดยส่ง username ไป
      await registerService(username, password);
      
      alert('สมัครสมาชิกสำเร็จ!');
      navigate('/login');

    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center' }}>สมัครสมาชิก</h2>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          {/* 3. แก้ Label และ Input Type */}
          <label>Username:</label>
          <input
            type="text" // เปลี่ยนเป็น text ธรรมดา
            value={username}
            onChange={handleUsernameChange}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        {/* ... (Password และ Confirm Password เหมือนเดิม) ... */}
        <div style={{ marginBottom: '15px' }}>
          <label>Password:</label>
          <input type="password" value={password} onChange={handlePasswordChange} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Confirm Password:</label>
          <input type="password" value={confirmPassword} onChange={handleConfirmPasswordChange} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>

        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>Register</button>
      </form>
      
      <p style={{ marginTop: '15px', textAlign: 'center', fontSize: '14px' }}>
        มีบัญชีอยู่แล้ว? <span onClick={() => navigate('/login')} style={{ color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}>เข้าสู่ระบบ</span>
      </p>
    </div>
  );
};

export default RegisterPage;