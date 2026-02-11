import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { searchUsers, fetchMessages, sendMessage, listenToMessages, getAllUsersList } from '../services/storageService';
import ThemeSelector, { Theme } from './ThemeSelector';

interface UserChatProps {
    currentUser: User;
    onReturnToChoice: () => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const UserChat: React.FC<UserChatProps> = ({ currentUser, onReturnToChoice, theme, setTheme }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load initial users (mock 'recent chats' by just showing all users or search results)
    useEffect(() => {
        loadUsers();
    }, [searchQuery]);

    const loadUsers = async () => {
        if (!searchQuery.trim()) {
            // Ideally load specific recent chats, but for now load some random users or nothing
            // Let's load all users for discovery
            const users = await getAllUsersList();
            setSearchResults(users.filter(u => u.id !== currentUser.id));
            return;
        }
        const users = await searchUsers(searchQuery);
        setSearchResults(users.filter(u => u.id !== currentUser.id));
    };

    // Load messages when a user is selected
    useEffect(() => {
        if (selectedUser) {
            loadMessages(selectedUser.id);

            const unsubscribe = listenToMessages(() => {
                loadMessages(selectedUser.id);
            });
            return () => { unsubscribe(); };
        }
    }, [selectedUser]);

    const loadMessages = async (userId: string) => {
        const msgs = await fetchMessages(userId);
        setMessages(msgs);
        scrollToBottom();
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedUser) return;

        // Optimistic update? No, let's wait for DB for consistency or just push it.
        // Let's rely on the real-time listener or manual fetch.
        try {
            await sendMessage(selectedUser.id, newMessage.trim());
            setNewMessage('');
            loadMessages(selectedUser.id); // Reload to be sure
        } catch (error) {
            console.error("Failed to send", error);
        }
    };

    const getThemeBackground = () => {
        switch (theme) {
            case 'space': return 'galaxy-bg';
            case 'snow': return 'snow-bg';
            case 'fire': return 'fire-bg';
            case 'wind': return 'wind-bg';
            default: return 'galaxy-bg';
        }
    };

    return (
        <div className={`flex h-[calc(100vh-56px)] ${getThemeBackground()} font-['Plus_Jakarta_Sans'] overflow-hidden relative transition-all duration-700`}>

            {/* Theme Background Elements */}
            {theme === 'space' && <div className="stars"></div>}
            {theme === 'snow' && <div className="snowflake">❄</div>}
            {/* Note: UserChat is simpler, maybe we reduce particles to avoid clutter or keep it consistent. Let's keep it consistent but maybe fewer. */}

            {theme === 'snow' && (
                <>
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="snowflake" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 5}s`, opacity: Math.random() * 0.5 }}>❄</div>
                    ))}
                </>
            )}

            {theme === 'fire' && (
                <>
                    {[...Array(15)].map((_, i) => (
                        <div key={i} className="ember" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, width: `${Math.random() * 4 + 2}px` }}></div>
                    ))}
                </>
            )}

            {theme === 'wind' && (
                <>
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="breeze" style={{ top: `${Math.random() * 80 + 10}%`, animationDelay: `${Math.random() * 3}s` }}></div>
                    ))}
                </>
            )}

            {/* Sidebar (User List) */}
            <div className={`w-full md:w-80 bg-white/80 dark:bg-black/40 backdrop-blur-md border-r border-white/20 flex flex-col ${selectedUser ? 'hidden md:flex' : 'flex'} z-10`}>

                {/* Sidebar Header */}
                <div className="p-4 bg-white/50 dark:bg-black/20 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Chats</h2>
                    <ThemeSelector currentTheme={theme} onThemeChange={setTheme} />
                    <button onClick={onReturnToChoice} className="text-sm text-white/80 hover:text-white hover:underline font-bold bg-white/10 px-2 py-1 rounded-lg">Exit</button>
                </div>

                {/* Search */}
                <div className="p-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search people..."
                            className="w-full pl-10 pr-4 py-2 rounded-full bg-black/10 dark:bg-white/10 border-none focus:ring-2 focus:ring-[#6C63FF] text-sm text-gray-800 dark:text-white placeholder-gray-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto">
                    {searchResults.map(user => (
                        <div
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            className={`flex items-center p-3 cursor-pointer hover:bg-white/10 transition-colors ${selectedUser?.id === user.id ? 'bg-[#6C63FF]/20 border-l-4 border-[#6C63FF]' : ''}`}
                        >
                            <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover border border-white/20" />
                            <div className="ml-3 flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">{user.name}</h3>
                                <p className="text-xs text-gray-600 dark:text-gray-300 truncate">@{user.username}</p>
                            </div>
                        </div>
                    ))}
                    {searchResults.length === 0 && (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">No users found.</div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col bg-white/30 dark:bg-black/30 backdrop-blur-sm ${!selectedUser ? 'hidden md:flex' : 'flex'} z-10`}>

                {selectedUser ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-3 bg-white/60 dark:bg-black/40 backdrop-blur-md flex items-center shadow-sm z-10 sticky top-0 border-b border-white/10">
                            <button onClick={() => setSelectedUser(null)} className="md:hidden mr-2 text-gray-500 dark:text-gray-300">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <img src={selectedUser.avatar} className="w-10 h-10 rounded-full border border-white/20" />
                            <div className="ml-3">
                                <h3 className="font-semibold text-gray-900 dark:text-white">{selectedUser.name}</h3>
                                <p className="text-xs text-gray-600 dark:text-gray-300">@{selectedUser.username}</p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, idx) => {
                                const isMe = msg.senderId === currentUser.id;
                                return (
                                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] rounded-2xl p-3 shadow-lg relative text-sm backdrop-blur-md ${isMe ? 'bg-[#6C63FF]/90 text-white rounded-tr-none' : 'bg-white/80 dark:bg-black/60 text-gray-900 dark:text-white rounded-tl-none border border-white/10'
                                            }`}>
                                            <p>{msg.content}</p>
                                            <p className={`text-[9px] text-right mt-1 ${isMe ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white/60 dark:bg-black/40 backdrop-blur-md flex items-center gap-2 border-t border-white/10">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Type a message..."
                                className="flex-1 rounded-full border border-white/10 bg-white/50 dark:bg-black/30 px-4 py-3 focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none text-gray-900 dark:text-white placeholder-gray-500"
                            />
                            <button
                                onClick={handleSend}
                                className="p-3 bg-[#6C63FF] text-white rounded-full hover:bg-purple-700 transition shadow-lg hover:scale-105"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-10 opacity-70">
                        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6 backdrop-blur-md border border-white/20">
                            <span className="text-4xl">
                                {theme === 'space' ? '🌌' : theme === 'snow' ? '❄️' : theme === 'fire' ? '🔥' : '💨'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold text-white shadow-black drop-shadow-md">Eiva Chat</h2>
                        <p className="mt-4 text-blue-100 max-w-md font-medium">
                            Select a user to start a secure transmission.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserChat;
