import axios from "axios";
import { clearSession, getToken, isTokenValid } from "./auth";

export const api = axios.create({
    baseURL: "",
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
</replace_in_file>
<task_progress>
- [x] #1 Buat ReAuthModal component
- [x] #1 Update api.js untuk simpan draft & tampilkan modal
- [ ] #1 Update MainChat.jsx untuk integrasi ReAuthModal
- [ ] #2 GPS Real-Time
- [ ] #3 Animasi Loading Tiga Titik
- [ ] #4 Tombol "Pilih Klinik Ini"
- [ ] #5 Dashboard Klinik
- [ ] #6 Dokumentasi Teknis
</task_progress>

