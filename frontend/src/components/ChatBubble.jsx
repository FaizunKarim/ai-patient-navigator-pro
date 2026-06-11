import React from 'react';

const ChatBubble = ({ message, isAi, imageUrl }) => {
  return (
    <div className={`flex ${isAi ? 'justify-start' : 'justify-end'} mb-5`}>
      <div className={`max-w-xl p-4 rounded-3xl text-sm leading-relaxed shadow-sm font-medium flex flex-col gap-2
        ${isAi 
          ? 'bg-white text-slate-700 border border-slate-100 rounded-tl-none text-[14px]' 
          : 'bg-indigo-600 text-white rounded-tr-none text-[14px]'
        }`}
      >
        {imageUrl && (
          <img 
            src={imageUrl} 
            alt="Lampiran Medis" 
            className="w-full max-h-64 object-cover rounded-xl border border-white/20 shadow-sm"
          />
        )}
        
        {message && <p>{message}</p>}
      </div>
    </div>
  );
};

export default ChatBubble;