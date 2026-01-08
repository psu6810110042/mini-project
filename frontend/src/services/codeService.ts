import axios from "axios";
import type { CodeSnippet } from "../types";

const API_URL = "";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export interface UpdateSnippetDto {
  title?: string;
  content?: string;
  language?: string;
  visibility?: "PUBLIC" | "PRIVATE";
  tags?: string[];
}

export const getCodes = async (): Promise<CodeSnippet[]> => {
  try {
    const response = await axios.get(
      `${API_URL}/api/snippets`,
      getAuthHeaders(),
    );
    return response.data;
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
};

export const getCodeById = async (id: string): Promise<CodeSnippet | null> => {
  try {
    const response = await axios.get(
      `${API_URL}/api/snippets/${id}`,
      getAuthHeaders(),
    );
    return response.data;
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
};

export const createCodeService = async (data: {
  title: string;
  content: string;
  language: string;
  visibility: "PUBLIC" | "PRIVATE";
  tags: string[];
}) => {
  const response = await axios.post(
    `${API_URL}/api/snippets`,
    data,
    getAuthHeaders(),
  );
  return response.data;
};

export const likeCodeService = async (id: string): Promise<void> => {
  await axios.post(`${API_URL}/api/snippets/${id}/like`, {}, getAuthHeaders());
};

export const updateCodeService = async (id: string, data: UpdateSnippetDto) => {
  await axios.patch(`${API_URL}/api/snippets/${id}`, data, getAuthHeaders());
};

export const deleteCodeService = async (id: string) => {
  await axios.delete(`${API_URL}/api/snippets/${id}`, getAuthHeaders());
};
