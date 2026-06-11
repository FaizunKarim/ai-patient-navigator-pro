import React, { useState } from 'react';

const HamburgerMenu = () => {

  const [isOpen, setIsOpen] = useState(false);

   const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
     
      <button 
        onClick={toggleMenu}
        className={`p-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 ${
          isOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
        }`}
        aria-label="Menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

           {isOpen && (
        <>
    
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          ></div>

          <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 origin-top-right">
            <div className="p-2 space-y-1">
              <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-colors">
                Pengaturan Profil
              </button>
              <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-colors">
                Bantuan Sistem
              </button>
              
              <div className="h-px bg-slate-100 my-1 mx-2"></div>
              
              <button 
                onClick={() => setIsOpen(false)}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                Tutup Menu
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HamburgerMenu;