import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { clearSession, getUser } from "../utils/auth";
import { LogOut, Menu, X, ArrowLeft, AlertTriangle, Info } from "lucide-react";
import { api } from "../utils/api";

const Dashboard = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const res = await api.get("/api/referral/list");
        if (res.data?.success) {
          setReferrals(res.data.data || []);
        }
      } catch {}
      setLoading(false);
    };
    fetchReferrals();
  }, []);

  const statusBadge = (urgency) => {
    switch (urgency) {
      case "HIGH":
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">Merah</span>;
      case "MEDIUM":
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">Kuning</span>;
      case "LOW":
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">Hijau</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">N/A</span>;
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans antialiased">
      {/* Sidebar */}
      <div className={`absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-20 transition-opacity ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} onClick={() => setSidebarOpen(false)} />
      <div className={`absolute left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-30 flex flex-col shadow-2xl transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 border-b">
          <h2 className="font-bold text-lg text-slate-800">Klinik Dashboard</h2>
          <p className="text-xs text-slate-500">Panel Monitoring Faskes</p>
        </div>
        <div className="flex-1 p-4">
          <div className="bg-indigo-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-indigo-800">Total Rujukan</p>
            <p className="text-3xl font-bold text-indigo-600">{referrals.length}</p>
          </div>
        </div>
        <div className="p-4 border-t">
          <button onClick={() => { clearSession(); navigate("/"); }} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-xl font-semibold text-sm">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-500 hover:bg-indigo-50 rounded-xl"><Menu className="w-5 h-5" /></button>
            <div>
              <h1 className="font-bold text-slate-800">Dashboard Klinik</h1>
              <p className="text-xs text-slate-500">Pantau rujukan pasien real-time</p>
            </div>
          </div>
          <button onClick={() => navigate("/chat")} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Chat
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          ) : referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Info className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-semibold">Belum Ada Rujukan</p>
              <p className="text-sm">Pasien yang memilih klinik akan muncul di sini secara real-time.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {referrals.map((ref, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-slate-800">{ref.patientName || "Pasien"}</h3>
                      <p className="text-sm text-slate-500">{ref.complaint || "Keluhan tidak tersedia"}</p>
                    </div>
                    {statusBadge(ref.urgency)}
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>🏥 {ref.facilityName || "-"}</span>
                    <span>📏 {ref.distance ? `${ref.distance} km` : "-"}</span>
                  </div>
                  {ref.referredAt && (
                    <p className="text-xs text-slate-400 mt-2">Dirujuk: {new Date(ref.referredAt).toLocaleString("id-ID")}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;