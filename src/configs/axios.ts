import axios from "axios";
import { getToken } from "@/services/authService";

const BASE_API_URL = () =>
    import.meta.env.BASE_URL
        ? import.meta.env.BASE_URL
        : "http://localhost:8080";

const axiosClient = axios.create({
    baseURL: BASE_API_URL(),
    timeout: 15000,
});

axiosClient.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        return Promise.reject(error);
    },
);

export default axiosClient;
