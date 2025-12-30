import axios from 'axios';

// ✅ ปล่อยว่างไว้ (เพื่อให้ Vite Proxy ทำงาน)
const API_URL = ''; 

// ฟังก์ชันสำหรับดึง Token จาก LocalStorage และสร้าง Header
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`, // ต้องแนบ Token ไปด้วยเสมอสำหรับ Admin
    },
  };
};

// --- Users Management ---

export const getAllUsers = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/users`, getAuthHeaders());
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้');
  }
};

export const deleteUser = async (id: number) => {
  try {
    const response = await axios.delete(`${API_URL}/api/users/${id}`, getAuthHeaders());
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'ลบผู้ใช้งานล้มเหลว');
  }
};

// --- Tags Management ---

export const getAllTags = async () => {
  try {
    // Note: บางครั้ง getTags อาจเป็น Public แต่ส่ง Token ไปด้วยก็ไม่เสียหาย
    const response = await axios.get(`${API_URL}/api/tags`, getAuthHeaders());
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'ไม่สามารถดึงข้อมูล Tag ได้');
  }
};

export const deleteTag = async (id: number) => {
  try {
    const response = await axios.delete(`${API_URL}/api/tags/${id}`, getAuthHeaders());
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'ลบ Tag ล้มเหลว');
  }
};