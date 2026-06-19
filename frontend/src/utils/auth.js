import { jwtDecode } from "jwt-decode";

export const getToken = () => {
    return localStorage.getItem("patient_token");
};

export const setSession = (token, user) => {
    localStorage.setItem("patient_token", token);
    localStorage.setItem("patient_data", JSON.stringify(user));
};

export const clearSession = () => {
    localStorage.removeItem("patient_token");
    localStorage.removeItem("patient_data");
};

export const getUser = () => {
    try {
        const raw = localStorage.getItem("patient_data");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const isTokenValid = (token) => {
    if (!token) return false;
    try {
        const decoded = jwtDecode(token);
        if (!decoded?.exp) return false;
        return decoded.exp * 1000 > Date.now();
    } catch {
        return false;
    }
};

export const isAuthenticated = () => {
    const token = getToken();
    return isTokenValid(token);
};
