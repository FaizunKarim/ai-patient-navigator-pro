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

export const isAuthenticated = () => {
    const token = getToken();
    return !!token; 
};