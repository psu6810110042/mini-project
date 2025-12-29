// ... (User Interface เดิมที่มีอยู่แล้ว)
export interface User {
  uid: string;
  email: string;
  role: 'admin' | 'user';
  lastOnline: string;
}

// ... (Tag Interface เดิมที่มีอยู่แล้ว)
export interface Tag {
  tagId: number;
  tagName: string;
}

// 👇👇 ส่วนที่ขาดหายไป คือส่วนนี้ครับ! 👇👇
export interface CodeSnippet {
  codeId: number;        
  title: string;         
  content: string;       
  visibility: boolean;   
  createdBy: string;     
  createdDate: string;
  lastModified: string;    
  tags: Tag[];           
  owner?: User;          
}

// ... (AuthResponse เดิมที่มีอยู่แล้ว)
export interface AuthResponse {
  accessToken: string;
  user: User;
}