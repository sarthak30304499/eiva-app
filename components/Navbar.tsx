
import React, { useState, useEffect } from 'react';
import { User, ViewState, SearchFilter, AppMode } from '../types';

interface NavbarProps {
  user: User | null;
  currentView: ViewState;
  appMode: AppMode;
  searchFilter: SearchFilter;
  voiceMode: boolean;
  onLogout: () => void;
  onSearch: (query: string, filter: SearchFilter) => void;
  onNavigate: (page: ViewState) => void;
  onSwitchMode: (mode: AppMode) => void;
  onToggleVoiceMode: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  user,
  currentView,
  appMode,
  searchFilter,
  voiceMode,
  onLogout,
  onSearch,
  onNavigate,
  onSwitchMode,
  onToggleVoiceMode,
  isDarkMode,
  toggleTheme
}) => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>(searchFilter);

  useEffect(() => {
    if (query.trim() !== '' || currentView === 'search') {
      onSearch(query, activeFilter);
    }
  }, [query, activeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, activeFilter);
    onNavigate('search');
  };

  const navClass = (view: ViewState) =>
    `px-3 py-2 text-sm font-bold transition-all border-b-2 ${currentView === view
      ? 'text-[#6C63FF] border-[#6C63FF]'
      : 'text-gray-400 dark:text-gray-500 border-transparent hover:text-gray-800'
    }`;

  return (
    <nav className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-50 px-4 transition-colors">
      <div className="max-w-5xl mx-auto flex items-center justify-between h-14">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => { setQuery(''); onNavigate('home'); }}
            className="text-xl font-black text-[#6C63FF] italic tracking-tighter"
          >
            EIVA
          </button>

          <div className="hidden md:flex space-x-1">
            <button onClick={() => onNavigate('home')} className={navClass('home')}>Feed</button>
            <button onClick={() => onNavigate('following')} className={navClass('following')}>Following</button>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-4 relative">
          <form onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="Search community..."
              className="w-full bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-full pl-10 pr-4 py-1.5 text-xs focus:ring-2 focus:ring-[#6C63FF] outline-none"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (currentView !== 'search') onNavigate('search');
              }}
            />
          </form>
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center space-x-4">


          <button
            onClick={() => onSwitchMode(appMode === 'ai' ? 'chat' : 'ai')}
            className="hidden sm:flex items-center space-x-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-[#6C63FF] hover:text-white transition-all"
          >
            <span>{appMode === 'ai' ? '💬 Eiva Chat' : '✨ EIVA AI'}</span>
          </button>

          <button onClick={toggleTheme} className="text-gray-400 hover:text-gray-600">
            {isDarkMode ? '🌞' : '🌙'}
          </button>

          {user && (
            <button
              onClick={() => onNavigate('profile')}
              className={`w-8 h-8 rounded-full border-2 ${currentView === 'profile' ? 'border-[#6C63FF]' : 'border-transparent'}`}
            >
              <img src={user.avatar} className="w-full h-full rounded-full object-cover" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
