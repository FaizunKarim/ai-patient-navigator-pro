import React from 'react';
import { api } from "../utils/api";

// Deteksi baris rekomendasi klinik: "1. Nama (xx km) - asuransi ..."
const FACILITY_LINE_RE = /^(\d+)\.\s+(.+?)\s+\(([\d.]+)\s*km\)/;

function parseFacilityRecommendations(text) {
  const lines = text.split('\n');
  const facilities = [];
  for (const line of lines) {
    const match = line.match(FACILITY_LINE_RE);
    if (match) {
      facilities.push({
        index: parseInt(match[1]),
        name: match[2],
        distance: parseFloat(match[3]),
        fullLine: line,
      });
    }
  }
  return facilities;
}

const ChatBubble = ({ message, isAi, mediaUrl, mediaType, loading, onSelectFacility }) => {
  // Mode loading
  if (loading) {
    return (
      <div className="flex justify-start mb-5">
        <div className="max-w-xl p-5 rounded-3xl text-sm leading-relaxed shadow-sm font-medium bg-white text-slate-700 border border-slate-100 rounded-tl-none flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
          <span className="text-xs text-slate-400 ml-1">AI sedang berpikir...</span>
        </div>
      </div>
    );
  }

  // Parse rekomendasi fasilitas jika pesan dari AI
  const facilities = isAi && message ? parseFacilityRecommendations(message) : [];

  return (
    <div className={`flex ${isAi ? 'justify-start' : 'justify-end'} mb-5`}>
      <div className={`max-w-xl p-4 rounded-3xl text-sm leading-relaxed shadow-sm font-medium flex flex-col gap-2
        ${isAi 
          ? 'bg-white text-slate-700 border border-slate-100 rounded-tl-none text-[14px]' 
          : 'bg-indigo-600 text-white rounded-tr-none text-[14px]'
        }`}
      >
        {mediaUrl && mediaType === 'image' && (
          <img src={mediaUrl} alt="Lampiran Medis" className="w-full max-h-64 object-cover rounded-xl border border-white/20 shadow-sm" />
        )}
        {mediaUrl && mediaType === 'video' && (
          <video src={mediaUrl} controls className="w-full max-h-64 rounded-xl" />
        )}
        {mediaUrl && mediaType === 'audio' && (
          <audio src={mediaUrl} controls className="w-full" />
        )}
        
        {message && <p style={{ whiteSpace: 'pre-wrap' }}>{message}</p>}

        {/* Tombol Pilih Klinik untuk setiap rekomendasi */}
        {facilities.length > 0 && (
          <div className="flex flex-col gap-2 mt-2 border-t pt-3">
            {facilities.map((f) => (
              <button
                key={f.index}
                onClick={() => {
                  if (onSelectFacility) onSelectFacility(f);
                }}
                className="w-full text-left bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border border-indigo-200"
              >
                Pilih {f.name} ({f.distance} km)
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
