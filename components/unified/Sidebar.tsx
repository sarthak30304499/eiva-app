import React from 'react';
import { User } from '../../types';
import { Search, Edit, MoreHorizontal, Circle } from 'lucide-react';
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
    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#1c1c1e]">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center space-x-3">
                    <button className="md:hidden text-blue-500">
                        {/* Mobile menu trigger */}
                    </button>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Chats</h1>
                </div>
                <div className="flex items-center space-x-3 text-blue-500">
                    <ThemeSelector currentTheme={currentTheme} onThemeChange={onThemeChange} />
                    <button className="hover:bg-blue-50 dark:hover:bg-white/10 p-2 rounded-full transition-colors">
                        <Edit size={20} />
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search"
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-[#2c2c2e] text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm placeholder-gray-500"
                    />
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* EIVA AI Chat Item */}
                <div
                    onClick={() => onSelectChat('eiva')}
                    className={`px-4 py-3 flex items-center space-x-3 cursor-pointer transition-colors ${selectedChatId === 'eiva'
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-[#2c2c2e]'
                        }`}
                >
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                            AI
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#1c1c1e] rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className={`flex justify-between items-baseline ${selectedChatId === 'eiva' ? 'text-white' : ''}`}>
                            <h3 className={`font-semibold text-base truncate ${selectedChatId === 'eiva' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                EIVA AI
                            </h3>
                            <span className={`text-xs ${selectedChatId === 'eiva' ? 'text-blue-100' : 'text-gray-500'}`}>Now</span>
                        </div>
                        <p className={`text-sm truncate ${selectedChatId === 'eiva' ? 'text-blue-100' : 'text-gray-500'}`}>
                            Ready to help you seamlessly.
                        </p>
                    </div>
                </div>

                {/* Separator */}
                <div className="h-px bg-gray-100 dark:bg-white/5 mx-4 my-1" />

                {/* User List */}
                {users.map((user) => (
                    <div
                        key={user.id}
                        onClick={() => onSelectChat(user)}
                        className={`px-4 py-3 flex items-center space-x-3 cursor-pointer transition-colors ${selectedChatId === user.id
                            ? 'bg-blue-500 text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-[#2c2c2e]'
                            }`}
                    >
                        <div className="relative">
                            <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-white/10"
                            />
                            {/* Online status indicator - stubbed for now */}
                            {/* <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#1c1c1e] rounded-full"></div> */}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={`flex justify-between items-baseline ${selectedChatId === user.id ? 'text-white' : ''}`}>
                                <h3 className={`font-semibold text-base truncate ${selectedChatId === user.id ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                    {user.name}
                                </h3>
                                <span className={`text-xs ${selectedChatId === user.id ? 'text-blue-100' : 'text-gray-500'}`}>
                                    10:30 AM
                                </span>
                            </div>
                            <p className={`text-sm truncate ${selectedChatId === user.id ? 'text-blue-100' : 'text-gray-500'}`}>
                                {user.bio || 'No status'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-gray-100 dark:border-white/5 mt-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <img src={currentUser?.avatar} className="w-8 h-8 rounded-full" alt="Me" />
                        <div className="text-sm font-medium dark:text-white">Profile</div>
                    </div>
                    <button onClick={onLogout} className="text-red-500 text-sm hover:underline">Log Out</button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
