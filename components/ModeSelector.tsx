
import React from 'react';
import { User, AppMode } from '../types';

interface ModeSelectorProps {
  user: User;
  onSelect: (mode: AppMode) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ user, onSelect }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-8 font-['Plus_Jakarta_Sans']">
      <div className="text-center mb-16 animate-fade-in">
        <h1 className="text-7xl font-black italic tracking-tighter text-[#6C63FF] mb-2">EIVA</h1>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">How would you like to use EIVA?</h2>
        <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-xs">Logged in as @{user.username}</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        <button
          onClick={() => onSelect('ai')}
          className="group bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] shadow-xl border-2 border-transparent hover:border-[#6C63FF] transition-all flex flex-col items-center text-center"
        >
          <div className="w-20 h-20 bg-genz-gradient rounded-3xl flex items-center justify-center text-white text-4xl mb-6 shadow-lg shadow-[#6C63FF]/20 group-hover:scale-110 transition-transform">
            ✨
          </div>
          <h3 className="text-2xl font-black mb-3">EIVA AI Chat</h3>
          <p className="text-gray-500 font-medium">Instant answers, image analysis, and private brainstorming with our most advanced intelligence.</p>
        </button>

        <button
          onClick={() => onSelect('community')}
          className="group bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] shadow-xl border-2 border-transparent hover:border-[#6C63FF] transition-all flex flex-col items-center text-center"
        >
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
            👥
          </div>
          <h3 className="text-2xl font-black mb-3">Community Feed</h3>
          <p className="text-gray-500 font-medium">Join public spaces, ask the community, follow experts, and see what the world is learning.</p>
        </button>

        <button
          onClick={() => onSelect('browser')}
          className="group bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] shadow-xl border-2 border-transparent hover:border-[#6C63FF] transition-all flex flex-col items-center text-center md:col-span-2 lg:col-span-1"
        >
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
            🌐
          </div>
          <h3 className="text-2xl font-black mb-3">Eiva Browser</h3>
          <p className="text-gray-500 font-medium">Privacy-focused search engine to explore the web without tracking.</p>
        </button>
      </div>
    </div>
  );
};

export default ModeSelector;
