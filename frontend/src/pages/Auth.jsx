import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setSession } from "../utils/auth";
import { Mail, Lock, User as UserIcon, BotMessageSquare } from "lucide-react";
import HeroImage from "../assets/login.svg";
import { api } from "../utils/api";

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const API_URL = isLogin
                ? "/api/auth/login"
                : "/api/auth/register";

            const response = await api.post(API_URL, formData);

            if (response.data && response.data.success) {
                if (isLogin) {
                    setSession(
                        response.data.token,
                        response.data.user
                    );
                    navigate("/chat", { replace: true });
                } else {
                    setIsLogin(true);
                    setFormData({
                        name: "",
                        email: "",
                        password: "",
                    });
                    setError("");
                    alert(
                        "Pendaftaran berhasil! Silakan masuk dengan akun baru Anda."
                    );
                }
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Koneksi ke server gagal. Pastikan backend menyala."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-tr from-[#EEF2F6] via-[#E0E7FF] to-[#F5F3FF] flex items-center justify-center p-4 font-sans overflow-hidden relative">
            <div className="bg-white/95 backdrop-blur-xl max-w-[400px] w-full rounded-[40px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.15)] border border-white/60 overflow-hidden relative z-10">
                <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-bl from-[#FBBF24] to-orange-400 rounded-bl-full z-0 opacity-80 transition-transform duration-700 hover:scale-110"></div>

                <div className="absolute bottom-0 right-0 translate-x-[20%] translate-y-[20%] h-36 w-36 bg-[#122A57] rounded-full z-0 opacity-90 transition-transform duration-700 hover:scale-110"></div>

                <div className="relative z-10 px-8 pt-8 pb-10 flex flex-col items-center">
                    <div className="w-full h-40 mb-6 bg-transparent rounded-3xl flex items-center justify-center overflow-hidden shadow-inner group">
                        <img
                            src={HeroImage}
                            alt="Chat-Health AI Illustration"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                    </div>

                    <div className="text-center mb-6 w-full">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <BotMessageSquare className="w-8 h-8 text-[#3B82F6] drop-shadow-md" />
                            <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
                                Chat-Health
                            </h1>
                        </div>

                        <p className="text-slate-500 text-sm font-medium">
                            {isLogin
                                ? "Welcome back! Securely log in."
                                : "Create your free AI account"}
                        </p>
                    </div>

                    {error && (
                        <div className="w-full bg-red-50/90 backdrop-blur-md border border-red-200 text-red-600 px-4 py-3.5 rounded-2xl text-sm font-medium mb-6 flex items-center gap-3 shadow-[0_4px_12px_rgba(220,38,38,0.1)]">
                            <span>{error}</span>
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className="w-full space-y-6"
                    >
                        {!isLogin && (
                            <div className="relative group bg-slate-50 rounded-2xl p-1 border border-slate-200">
                                <UserIcon className="absolute left-4 top-4 w-5 h-5 text-slate-400" />

                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Full Name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required={!isLogin}
                                    className="w-full pl-12 pr-4 py-3 bg-transparent text-sm focus:outline-none"
                                />
                            </div>
                        )}

                        <div className="relative group bg-slate-50 rounded-2xl p-1 border border-slate-200">
                            <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-400" />

                            <input
                                type="email"
                                name="email"
                                placeholder="Email Address"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full pl-12 pr-4 py-3 bg-transparent text-sm focus:outline-none"
                            />
                        </div>

                        <div className="relative group bg-slate-50 rounded-2xl p-1 border border-slate-200">
                            <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-400" />

                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full pl-12 pr-4 py-3 bg-transparent text-sm focus:outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#3B82F6] text-white font-bold py-4 rounded-2xl"
                        >
                            {loading
                                ? "Processing..."
                                : isLogin
                                    ? "Login to Dashboard"
                                    : "Sign Up"}
                        </button>
                    </form>

                    <p className="text-center text-xs text-slate-500 mt-6 font-medium">
                        {isLogin
                            ? "Don't have an account?"
                            : "Already have an account?"}{" "}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError("");
                            }}
                            className="text-[#3B82F6] font-bold"
                            type="button"
                        >
                            {isLogin ? "Sign up" : "Log in"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Auth;
