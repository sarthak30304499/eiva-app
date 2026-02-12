
import React, { useState, useEffect } from 'react';
import { User, ViewState, SearchFilter, AppMode } from '../types';

interface NavbarProps {
  user: User | null;
  currentView: ViewState;
  appMode: AppMode;
  voiceMode: boolean; // Keep for now if passed, though unused in new layout
  onLogout: () => void;
  onNavigate: (page: ViewState) => void;
  onSwitchMode: (mode: AppMode) => void;
  onToggleVoiceMode: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  // Deprecated/Unused props kept optional to prevent immediate break if not cleaned in parent
  searchFilter?: SearchFilter;
  onSearch?: (query: string, filter: SearchFilter) => void;
}

const Navbar: React.FC<NavbarProps> = ({
  user,
  currentView,
  appMode,
  voiceMode,
  onLogout,
  onNavigate,
  onSwitchMode,
  onToggleVoiceMode,
  isDarkMode,
  toggleTheme
}) => {
  // Removed search state and handlers

  return (
    <nav className="bg-white/80 dark:bg-[#0f1014]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 sticky top-0 z-50 px-4 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16">

        {/* Left: Logo */}
        <button
          onClick={() => onNavigate('home')}
          className="group relative flex items-center space-x-2"
        >
          <span className="text-3xl font-black italic tracking-tighter bg-gradient-to-r from-[#6C63FF] via-[#00C6FF] to-[#FF6B81] text-transparent bg-clip-text drop-shadow-sm group-hover:scale-105 transition-transform duration-300">
            EIVA
          </span>
          <span className="hidden sm:block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity -ml-2 translate-x-2 group-hover:translate-x-0">
            OS
          </span>
        </button>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3 sm:space-x-5">

          <button
            onClick={() => onSwitchMode(appMode === 'ai' ? 'chat' : 'ai')}
            className={`
              hidden sm:flex items-center space-x-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest
              transition-all duration-300 border
              ${appMode === 'ai'
                ? 'bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] border-white/10 text-white shadow-lg'
                : 'bg-white border-gray-200 text-gray-700 hover:border-purple-200'}
            `}
          >
            <span className={appMode === 'ai' ? 'text-[#00C6FF]' : 'text-purple-500'}>
              {appMode === 'ai' ? '●' : '○'}
            </span>
            <span>{appMode === 'ai' ? 'Eiva Chat' : 'Eiva AI'}</span>
          </button>

          <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-2"></div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors dark:hover:bg-white/5"
            title="Toggle Theme"
          >
            {isDarkMode ? '🌞' : '🌙'}
          </button>

          {user && (
            <button
              onClick={() => onNavigate('profile')}
              className={`relative group w-9 h-9 rounded-full padding-0.5 border-2 transition-all ${currentView === 'profile' ? 'border-[#6C63FF]' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}`}
            >
              <img src={user.avatar} className="w-full h-full rounded-full object-cover shadow-sm" alt="Profile" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
