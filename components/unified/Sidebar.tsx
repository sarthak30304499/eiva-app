import React, { useState } from 'react';
import { User } from '../../types';
import { Search, Plus, MoreHorizontal, Menu } from 'lucide-react';
import ThemeSelector, { Theme } from '../ThemeSelector';

interface SidebarProps {
    currentUser: User | null;
    selectedChatId: string | null;
    onSelectChat: (chat: User | 'eiva') => void;
    users: User[];
    onLogout: () => void;
    currentTheme: Theme;
    onThemeChange: (theme: Theme) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    currentUser,
    selectedChatId,
    onSelectChat,
    users,
    onLogout,
    currentTheme,
    onThemeChange
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false); // Mobile menu state stub

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.bio && user.bio.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleNewChat = () => {
        // For now, this just resets selection or focuses search
        // In a real app, this might open a "New Message" modal
        onSelectChat('eiva'); // Default to AI for new chat or just clear
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#1c1c1e] transition-colors duration-300">
            {/* Header */}
            <div className="px-4 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5 bg-opacity-70 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center space-x-3">
                    <button className="md:hidden text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                        <Menu size={24} />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Chats</h1>
                </div>
                <div className="flex items-center space-x-2">
                    <ThemeSelector currentTheme={currentTheme} onThemeChange={onThemeChange} />
                    <button
                        onClick={handleNewChat}
                        className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-all shadow-sm active:scale-95"
                        title="New Chat"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-3">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search chats"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-[#2c2c2e] text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm placeholder-gray-500"
                    />
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1 p-2">
                {/* EIVA AI Chat Item - Always visible unless filtered out strict? No, usually AI is pinned or separate */}
                {/* We'll include AI in search if "eiva" or "ai" matches, or always show if search is empty */}
                {('eiva ai'.includes(searchQuery.toLowerCase()) || searchQuery === '') && (
                    <div
                        onClick={() => onSelectChat('eiva')}
                        className={`px-3 py-3 flex items-center space-x-3 cursor-pointer rounded-xl transition-all duration-200 ${selectedChatId === 'eiva'
                            ? 'bg-blue-500 text-white shadow-md transform scale-[1.02]'
                            : 'hover:bg-gray-100 dark:hover:bg-[#2c2c2e] text-gray-900 dark:text-white'
                            }`}
                    >
                        <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                                AI
                            </div>
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#1c1c1e] rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h3 className={`font-semibold text-[15px] truncate ${selectedChatId === 'eiva' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                    EIVA AI
                                </h3>
                                <span className={`text-xs ${selectedChatId === 'eiva' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>Now</span>
                            </div>
                            <p className={`text-sm truncate ${selectedChatId === 'eiva' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                Ready to help you seamlessly.
                            </p>
                        </div>
                    </div>
                )}

                {/* Separator - only show if both lists have items */}
                {searchQuery === '' && filteredUsers.length > 0 && (
                    <div className="h-px bg-gray-100 dark:bg-white/5 mx-4 my-2" />
                )}

                {/* User List */}
                {filteredUsers.length === 0 && searchQuery !== '' && !'eiva ai'.includes(searchQuery.toLowerCase()) ? (
                    <div className="text-center text-gray-500 mt-10 text-sm">No chats found</div>
                ) : (
                    filteredUsers.map((user) => (
                        <div
                            key={user.id}
                            onClick={() => onSelectChat(user)}
                            className={`px-3 py-3 flex items-center space-x-3 cursor-pointer rounded-xl transition-all duration-200 ${selectedChatId === user.id
                                ? 'bg-blue-500 text-white shadow-md transform scale-[1.02]'
                                : 'hover:bg-gray-100 dark:hover:bg-[#2c2c2e] text-gray-900 dark:text-white'
                                }`}
                        >
                            <div className="relative flex-shrink-0">
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-white/10 shadow-sm"
                                />
                                {user.id === 'user_1' && ( // Example online status for demo
                                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#1c1c1e] rounded-full"></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h3 className={`font-semibold text-[15px] truncate ${selectedChatId === user.id ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                        {user.name}
                                    </h3>
                                    <span className={`text-xs ${selectedChatId === user.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                        10:30 AM
                                    </span>
                                </div>
                                <p className={`text-sm truncate ${selectedChatId === user.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {user.bio || 'No status'}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 hover:opacity-80 cursor-pointer transition-opacity">
                        <img src={currentUser?.avatar} className="w-9 h-9 rounded-full border border-gray-200 dark:border-white/10" alt="Me" />
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white leading-none">{currentUser?.name?.split(' ')[0]}</span>
                            <span className="text-xs text-blue-500 mt-0.5">My Profile</span>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="text-gray-500 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Log Out"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
