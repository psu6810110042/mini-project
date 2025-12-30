export interface User {
  id: number;
  username: string;
  role: "ADMIN" | "USER";
}

export interface Tag {
  id: number;
  name: string;
}

export interface CodeSnippet {
  id: string;
  title: string;
  content: string;
  language: string;
  visibility: "PUBLIC" | "PRIVATE";

  author: User;
  authorId: number;

  likes: User[];
  tags: Tag[];

  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: number;
    username: string;
    role: "ADMIN" | "USER";
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
