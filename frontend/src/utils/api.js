import axios from "axios";
import { clearSession, getToken, isTokenValid } from "./auth";

const baseURL = import.meta.env.VITE_API_BASE_URL || "";

export const api = axios.create({
    baseURL,
});

// Store untuk draft message & callback
let _draftQueue = [];
let _onAuthFailed = null;

export const setOnAuthFailed = (cb) => {
    _onAuthFailed = cb;
};

export const getDraftQueue = () => [..._draftQueue];

export const clearDraftQueue = () => {
    _draftQueue = [];
};

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
        const reqData = err?.config?.data;

        if (status === 401 || status === 403) {
            // Simpan draft pesan jika ada data request
            if (reqData) {
                try {
                    const parsed = typeof reqData === "string" ? JSON.parse(reqData) : reqData;
                    if (parsed.message) {
                        _draftQueue.push(parsed.message);
                    }
                } catch {
                    // abaikan jika gagal parse
                }
            }

            // Panggil callback re-auth jika ada
            if (_onAuthFailed) {
                _onAuthFailed();
            } else {
                clearSession();
            }
        }
        return Promise.reject(err);
    }
);