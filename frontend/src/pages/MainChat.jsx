import { useNavigate } from "react-router-dom";
import { clearSession } from "../utils/auth";
import { Activity } from "lucide-react";

const MainChat = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        clearSession(); // Hapus token dari brankas
        navigate("/");  // Lempar kembali ke halaman Login
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
            <Activity className="w-16 h-16 text-blue-600 mb-4" />
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Selamat Datang di Dasbor Medis</h1>
            <p className="text-slate-600 mb-8">Anda berhasil melewati sistem keamanan Sprint 1!</p>

            <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
                Keluar (Logout)
            </button>
        </div>
    );
};

export default MainChat;