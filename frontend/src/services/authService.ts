import axios, { AxiosError } from "axios";

const API_URL = "";

export const registerService = async (username: string, password: string) => {
    try {
        const response = await axios.post(`${API_URL}/api/auth/register`, {
            username: username,
            password: password,
        });
        return response.data;
    } catch (error: unknown) {
        const axiosError = error as AxiosError<{ message: string }>;
        throw new Error(
            axiosError.response?.data?.message ||
                "Something went wrong with registering",
        );
    }
};

export const loginService = async (username: string, password: string) => {
    try {
        const response = await axios.post(`${API_URL}/api/auth/login`, {
            username,
            password,
        });
        return response.data;
    } catch (error: unknown) {
        const axiosError = error as AxiosError<{ message: string }>;
        throw new Error(
            axiosError.response?.data?.message || "Invalid credentials",
        );
    }
};
