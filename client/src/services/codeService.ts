import axios from 'axios';
import type { CodeSnippet } from "../types";

const API_URL = ''; // ให้ Proxy ทำงาน

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// 1. ดึงข้อมูลทั้งหมด
export const getCodes = async (): Promise<CodeSnippet[]> => {
  try {
    const response = await axios.get(`${API_URL}/api/snippets`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
};

// 2. ✅ สร้าง Code ใหม่ (Create)
export const createCodeService = async (data: { 
  title: string, 
  content: string, 
  language: string, 
  visibility: 'PUBLIC' | 'PRIVATE',
  tags: string[] 
}) => {
  const response = await axios.post(`${API_URL}/api/snippets`, data, getAuthHeaders());
  return response.data;
};

// 3. กด Like (Toggle)
export const likeCodeService = async (id: string): Promise<void> => {
  // Backend ใช้ POST /api/snippets/:id/like
  await axios.post(`${API_URL}/api/snippets/${id}/like`, {}, getAuthHeaders());
};

// 4. แก้ไข Code
export const updateCodeService = async (id: string, data: Partial<CodeSnippet>) => {
  await axios.patch(`${API_URL}/api/snippets/${id}`, data, getAuthHeaders());
};

// 5. ลบ Code
export const deleteCodeService = async (id: string) => {
  await axios.delete(`${API_URL}/api/snippets/${id}`, getAuthHeaders());
};