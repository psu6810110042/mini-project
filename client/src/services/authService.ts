import axios from 'axios';

// ✅ ปล่อยว่างไว้ (เพื่อให้ Vite Proxy ทำงาน)
const API_URL = ''; 

// ฟังก์ชันสมัครสมาชิก (ของเดิมที่คุณมี)
export const registerService = async (username: string, password: string) => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/register`, { 
      username: username, 
      password: password
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'การสมัครสมาชิกผิดพลาด');
  }
};

// 👇👇 เพิ่มฟังก์ชัน Login ตรงนี้ครับ 👇👇
export const loginService = async (username: string, password: string) => {
  try {
    // ยิงไปที่ Endpoint Login ของ Backend
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: username, 
      password: password
    });
    return response.data;
  } catch (error: any) {
    // ถ้า Login ไม่ผ่าน ให้ส่งข้อความ Error กลับไป
    throw new Error(error.response?.data?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
};