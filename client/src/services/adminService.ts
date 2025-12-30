import axios, { AxiosError } from "axios";

const API_URL = "";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getAllUsers = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/users`, getAuthHeaders());
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError<{ message: string }>;
    throw new Error(
      axiosError.response?.data?.message || "Unable to get all users",
    );
  }
};

export const deleteUser = async (id: number) => {
  try {
    const response = await axios.delete(
      `${API_URL}/api/users/${id}`,
      getAuthHeaders(),
    );
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError<{ message: string }>;
    throw new Error(
      axiosError.response?.data?.message || "Unable to delete users",
    );
  }
};

export const getAllTags = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/tags`, getAuthHeaders());
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError<{ message: string }>;
    throw new Error(
      axiosError.response?.data?.message || "Unable to get all tags",
    );
  }
};

export const deleteTag = async (id: number) => {
  try {
    const response = await axios.delete(
      `${API_URL}/api/tags/${id}`,
      getAuthHeaders(),
    );
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError<{ message: string }>;
    throw new Error(
      axiosError.response?.data?.message || "Unable to delete tag",
    );
  }
};
