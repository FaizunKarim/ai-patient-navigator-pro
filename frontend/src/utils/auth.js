// Mengambil token dari LocalStorage
export const getToken = () => {
    return localStorage.getItem("patient_token");
};

// Menyimpan token beserta data user
export const setSession = (token, user) => {
    localStorage.setItem("patient_token", token);
    localStorage.setItem("patient_data", JSON.stringify(user));
};

// Menghapus sesi saat Logout
export const clearSession = () => {
    localStorage.removeItem("patient_token");
    localStorage.removeItem("patient_data");
};

// Mengecek apakah user sedang login
export const isAuthenticated = () => {
    const token = getToken();
    return !!token; // Mengembalikan true jika token ada
};