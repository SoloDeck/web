import axios from "axios";

const BASE_API_URL = () =>
    import.meta.env.BASE_URL
        ? import.meta.env.BASE_URL
        : "http://localhost:8080";

const axiosClient = axios.create({
    baseURL: BASE_API_URL(),
    timeout: 15000,
});

axiosClient.interceptors.request.use((config) => {
  
    return config;
});

axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        return Promise.reject(error);
    },
);

export default axiosClient;
