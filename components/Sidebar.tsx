import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { fetchRecentChats, searchUsers } from '../services/storageService';
import { Search, LogOut, Bot } from 'lucide-react';

interface SidebarProps {
    currentUser: User;
    selectedChatId: string | 'eiva' | null;
    onSelectChat: (chat: User | 'eiva') => void;
    onLogout: () => void;
    onOpenProfile: () => void;
    isMobileOpen: boolean;
    onCloseMobile: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    currentUser,
    selectedChatId,
    onSelectChat,
    onLogout,
    onOpenProfile,
    isMobileOpen,
    onCloseMobile
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [recentChats, setRecentChats] = useState<User[]>([]);
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        loadRecentChats();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                handleSearch();
            } else {
                setIsSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const loadRecentChats = async () => {
        const chats = await fetchRecentChats();
        setRecentChats(chats);
    };

    const handleSearch = async () => {
        setIsSearching(true);
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        const results = await searchUsers(searchQuery);
        setSearchResults(results.filter(u => u.id !== currentUser.id));
    };

    const chatsToDisplay = isSearching ? searchResults : recentChats;

    return (
        <aside className={`
      fixed inset-y-0 left-0 z-40 w-80 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-r border-gray-200 dark:border-white/10
      transform transition-transform duration-300 ease-in-out
      ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-white/5">
                <button onClick={onOpenProfile} className="relative group">
                    <img
                        src={currentUser.avatar}
                        alt="Profile"
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-transparent group-hover:ring-blue-500 transition-all"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={onLogout}
                        className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                        title="Log out"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="p-3">
                <div className="relative group">
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-black/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                </div>
            </div>

            {/* Chat List */}
            <div className="overflow-y-auto h-[calc(100vh-130px)] px-2 space-y-1">

                {/* Pinned AI Chat */}
                {!isSearching && (
                    <div className="mb-2">
                        <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Pinned</div>
                        <button
                            onClick={() => { onSelectChat('eiva'); onCloseMobile(); }}
                            className={`w-full flex items-center p-3 rounded-xl transition-all ${selectedChatId === 'eiva'
                                    ? 'bg-blue-50 dark:bg-blue-500/10'
                                    : 'hover:bg-gray-100 dark:hover:bg-white/5'
                                }`}
                        >
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                                    <Bot size={24} />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#1c1c1e] rounded-full"></div>
                            </div>
                            <div className="ml-3 text-left">
                                <h3 className="font-semibold text-gray-900 dark:text-white">EIVA AI</h3>
                                <p className="text-sm text-blue-500 font-medium">Always active</p>
                            </div>
                        </button>
                    </div>
                )}

                {/* User Chats */}
                <div>
                    <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {isSearching ? 'Search Results' : 'Recent Chats'}
                    </div>

                    {chatsToDisplay.length === 0 && (
                        <div className="px-4 py-8 text-center text-gray-400 text-sm">
                            {isSearching ? 'No users found' : 'No recent chats'}
                        </div>
                    )}

                    {chatsToDisplay.map(user => (
                        <button
                            key={user.id}
                            onClick={() => { onSelectChat(user); onCloseMobile(); }}
                            className={`w-full flex items-center p-3 rounded-xl transition-all ${selectedChatId === user.id
                                    ? 'bg-blue-50 dark:bg-blue-500/10'
                                    : 'hover:bg-gray-100 dark:hover:bg-white/5'
                                }`}
                        >
                            <img src={user.avatar} className="w-12 h-12 rounded-full object-cover bg-gray-200" alt={user.name} />
                            <div className="ml-3 text-left overflow-hidden">
                                <h3 className="font-medium text-gray-900 dark:text-white truncate">{user.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
