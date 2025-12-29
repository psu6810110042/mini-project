import axios from 'axios';

// URL ของ Backend (เตรียมไว้สำหรับตอนเชื่อมจริง)
const API_URL = 'http://localhost:3000';

export const registerService = async (email: string, password: string) => {
  try {
    // ยิงไปที่ Endpoint /users หรือ /auth/register (แล้วแต่ Backend จะออกแบบ)
    // ตอนนี้เขียนโค้ดเตรียมไว้ก่อน
    const response = await axios.post(`${API_URL}/users/register`, {
      email,
      password
    });
    return response.data;
  } catch (error: any) {
    // ถ้า error ให้โยนข้อความออกไป เพื่อให้หน้าเว็บแสดง Alert
    throw new Error(error.response?.data?.message || 'การสมัครสมาชิกผิดพลาด');
  }
};