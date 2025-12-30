// Types ให้ตรงกับ Backend Entity

export interface User {
  id: number;          // Backend User ID เป็น number
  username: string;    // Backend ใช้ username
  role: 'ADMIN' | 'USER'; // Backend เป็น Enum
}

export interface Tag {
  id: number;
  name: string;
}

export interface CodeSnippet {
  id: string;          // ✅ Backend ใช้ NanoID (String)
  title: string;
  content: string;
  language: string;    // ✅ มี field นี้เพิ่มมา
  visibility: 'PUBLIC' | 'PRIVATE'; // ✅ Backend ใช้ Enum
  
  author: User;        // ✅ Backend ส่งมาทั้ง Object User
  authorId: number;

  likes: User[];       // ✅ Array ของ User ที่กดไลก์
  tags: Tag[];
  
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string; 
  user: {
    id: number;
    username: string;
    role: 'ADMIN' | 'USER';
  };
}

export interface LoginFieldValues {
  username: string;
  password: string; 
}

export interface RegisterFieldValues {
  username: string;
  password: string;
}