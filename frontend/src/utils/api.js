import axios from "axios";
import { clearSession, getToken, isTokenValid } from "./auth";

export const api = axios.create({
    baseURL: "",
});

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token && isTokenValid(token)) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
            clearSession();
        }
        return Promise.reject(err);
    }
);

