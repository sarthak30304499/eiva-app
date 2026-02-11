
import React from 'react';
import { User, AppMode } from '../types';

interface ModeSelectorProps {
  user: User;
  onSelect: (mode: AppMode) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ user, onSelect }) => {
  return (
      <div className="absolute inset-0 stars"></div>
      
      <div className="relative z-10 text-center mb-16 animate-fade-in">
        <h1 className="text-7xl font-black italic tracking-tighter text-white mb-2 floating">EIVA</h1>
        <h2 className="text-2xl font-bold text-gray-200">How would you like to use EIVA?</h2>
        <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-xs">Logged in as @{user.username}</p>
      </div>

      <div className="relative z-10 grid md:grid-cols-3 gap-8 w-full max-w-6xl px-4">
        <button
          onClick={() => onSelect('ai')}
          className="group bg-white/10 backdrop-blur-lg p-10 rounded-[2.5rem] shadow-2xl border border-white/10 hover:border-[#6C63FF] transition-all flex flex-col items-center text-center hover:bg-white/15"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-[#6C63FF] to-[#00C6FF] rounded-3xl flex items-center justify-center text-white text-4xl mb-6 shadow-lg shadow-[#6C63FF]/30 group-hover:scale-110 transition-transform">
            ✨
          </div>
          <h3 className="text-2xl font-black mb-3 text-white">EIVA AI Chat</h3>
          <p className="text-gray-300 font-medium text-sm">Instant answers, image analysis, and private brainstorming with our most advanced intelligence.</p>
        </button>

        <button
          onClick={() => onSelect('chat')}
          className="group bg-white/10 backdrop-blur-lg p-10 rounded-[2.5rem] shadow-2xl border border-white/10 hover:border-green-500 transition-all flex flex-col items-center text-center hover:bg-white/15"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-3xl flex items-center justify-center text-white text-4xl mb-6 shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform">
            💬
          </div>
          <h3 className="text-2xl font-black mb-3 text-white">Eiva Chat</h3>
          <p className="text-gray-300 font-medium text-sm">Chat with friends, find new people, and connect instantly. WhatsApp-style messaging.</p>
        </button>

        <button
          onClick={() => onSelect('browser')}
          className="group bg-white/10 backdrop-blur-lg p-10 rounded-[2.5rem] shadow-2xl border border-white/10 hover:border-blue-500 transition-all flex flex-col items-center text-center hover:bg-white/15"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl flex items-center justify-center text-white text-4xl mb-6 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
            🌐
          </div>
          <h3 className="text-2xl font-black mb-3 text-white">Eiva Browser</h3>
          <p className="text-gray-300 font-medium text-sm">Privacy-focused search engine to explore the web without tracking.</p>
        </button>
      </div>
    </div >
  );
};

export default ModeSelector;
