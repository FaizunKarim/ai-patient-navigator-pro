import React from 'react';

const SidebarHistory = ({ historyList = [], onNewChat }) => {
  return (
    <div className="w-full h-full flex flex-col p-5">
      
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
          H
        </div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight truncate">
          Chat-<span className="text-indigo-600">Health</span>
        </h1>
      </div>
      
      <button 
        onClick={onNewChat}
        className="w-full py-3 px-4 mb-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl shadow-md shadow-indigo-600/10 transition-all text-sm tracking-wide active:scale-[0.98]"
      >
        + Chat Baru
      </button>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-3">
          Riwayat Sesi
        </p>

        {historyList.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-100/50 rounded-2xl border border-dashed border-slate-300">
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Belum ada riwayat percakapan. Mulai chat baru sekarang!
                </p>
            </div>
        ) : (
            historyList.map((session, index) => (
                <div key={index} className="p-3.5 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200/80 hover:shadow-sm cursor-pointer transition group">
                    <div className="text-sm font-semibold text-slate-600 group-hover:text-slate-700 truncate flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-indigo-500 transition-colors"></span>
                        {session.title || "Konsultasi Medis"}
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default SidebarHistory;