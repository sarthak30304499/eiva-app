import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { searchUsers, fetchMessages, sendMessage, listenToMessages, fetchRecentChats, updateUserProfile, fetchUserProfile } from '../services/storageService'; // Added fetchRecentChats, updateUserProfile, fetchUserProfile
import ThemeSelector, { Theme } from './ThemeSelector';

interface UserChatProps {
    currentUser: User;
    onReturnToChoice: () => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const UserChat: React.FC<UserChatProps> = ({ currentUser: initialUser, onReturnToChoice, theme, setTheme }) => {
    // State
    const [currentUser, setCurrentUser] = useState(initialUser); // Local state for immediate updates
    const [view, setView] = useState<'recent' | 'search'>('recent');
    const [recentChats, setRecentChats] = useState<User[]>([]);
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showContactInfo, setShowContactInfo] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [newUsername, setNewUsername] = useState(currentUser.username);
    const [newName, setNewName] = useState(currentUser.name);
    const [newBio, setNewBio] = useState(currentUser.bio);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        loadRecentChats();
    }, []);

    // Load recent chats
    const loadRecentChats = async () => {
        const chats = await fetchRecentChats();
        setRecentChats(chats);
    };

    // Refresh current user profile occasionally or on demand
    const refreshCurrentUser = async () => {
        const updated = await fetchUserProfile(currentUser.id);
        if (updated) setCurrentUser(updated);
    };

    // Search Logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (view === 'search') {
                handleSearch();
            }
        }, 300); // Debounce
        return () => clearTimeout(timer);
    }, [searchQuery, view]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        const results = await searchUsers(searchQuery);
        setSearchResults(results.filter(u => u.id !== currentUser.id));
    };

    // Message Loading
    useEffect(() => {
        if (selectedUser) {
            loadMessages(selectedUser.id);
            const unsubscribe = listenToMessages(() => {
                loadMessages(selectedUser.id);
                loadRecentChats(); // Refresh recent list order on new message
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
        try {
            await sendMessage(selectedUser.id, newMessage.trim());
            setNewMessage('');
            loadMessages(selectedUser.id);
            loadRecentChats();
        } catch (error) {
            console.error("Failed to send", error);
        }
    };

    const handleSaveProfile = async () => {
        try {
            await updateUserProfile(currentUser.id, {
                username: newUsername,
                name: newName,
                bio: newBio
            });
            await refreshCurrentUser();
            setIsEditingProfile(false);
            // alert("Profile updated!"); // Or toast
        } catch (e) {
            console.error("Profile update failed", e);
            alert("Failed to update profile.");
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
            {/* Background Effects */}
            {theme === 'space' && <div className="stars"></div>}
            {/* ... other theme effects ... */}

            {/* --- SIDEBAR --- */}
            <div className={`w-full md:w-96 bg-white/90 dark:bg-[#111b21]/90 backdrop-blur-md border-r border-white/10 flex flex-col ${selectedUser ? 'hidden md:flex' : 'flex'} z-20`}>

                {/* Header */}
                <div className="p-4 bg-gray-100 dark:bg-[#202c33] flex justify-between items-center border-b border-gray-200 dark:border-gray-700/50">
                    <button onClick={() => setShowProfileModal(true)} className="relative group">
                        <img src={currentUser.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-300 dark:border-gray-600 group-hover:opacity-80 transition" />
                    </button>
                    <div className="flex gap-4 text-gray-600 dark:text-[#aebac1]">
                        <button onClick={onReturnToChoice} title="Exit Chat" className="hover:text-gray-800 dark:hover:text-white transition">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="p-3 bg-white dark:bg-[#111b21] border-b border-gray-100 dark:border-gray-800">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search or start new chat"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (e.target.value) setView('search');
                                else setView('recent');
                            }}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-[#202c33] border-none focus:ring-1 focus:ring-[#00a884] text-sm text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-[#8696a0]"
                        />
                        <button
                            className="absolute left-3 top-2.5 text-gray-500 dark:text-[#8696a0]"
                            onClick={() => { if (view === 'search') { setView('recent'); setSearchQuery(''); } }}
                        >
                            {view === 'search' ? (
                                <svg className="w-4 h-4 cursor-pointer hover:text-[#00a884]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-[#111b21]">
                    {view === 'recent' && (
                        <>
                            {recentChats.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 dark:text-[#8696a0] text-sm">
                                    <p className="mb-2">No active chats.</p>
                                    <p>Search for a username to start chatting.</p>
                                </div>
                            ) : (
                                recentChats.map(user => (
                                    <div
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        className={`flex items-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#202c33] transition-colors ${selectedUser?.id === user.id ? 'bg-gray-200 dark:bg-[#2a3942]' : ''}`}
                                    >
                                        <img src={user.avatar} className="w-12 h-12 rounded-full object-cover" />
                                        <div className="ml-3 flex-1 border-b border-gray-100 dark:border-gray-800 pb-3">
                                            <div className="flex justify-between items-baseline">
                                                <h3 className="font-medium text-gray-900 dark:text-gray-100">{user.name || user.username}</h3>
                                                {/* Timestamp could go here */}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-[#8696a0] truncate">
                                                Click to open chat
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </>
                    )}

                    {view === 'search' && (
                        <>
                            <div className="p-4 text-xs font-bold text-[#00a884] uppercase tracking-wider">Search Results</div>
                            {searchResults.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => { setSelectedUser(user); setSearchQuery(''); setView('recent'); }}
                                    className="flex items-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#202c33] transition-colors"
                                >
                                    <img src={user.avatar} className="w-12 h-12 rounded-full object-cover" />
                                    <div className="ml-3 flex-1 border-b border-gray-100 dark:border-gray-800 pb-3">
                                        <h3 className="font-medium text-gray-900 dark:text-gray-100">@{user.username}</h3>
                                        <p className="text-xs text-gray-500 dark:text-[#8696a0]">{user.name}</p>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* --- MAIN CHAT AREA --- */}
            <div className={`flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] ${!selectedUser ? 'hidden md:flex' : 'flex'} relative`}>
                {/* Chat Background Pattern Image could go here overlay with opacity */}
                <div className="absolute inset-0 opacity-[0.06] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] pointer-events-none"></div>

                {selectedUser ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-4 py-2.5 bg-gray-100 dark:bg-[#202c33] flex items-center justify-between border-b border-gray-200 dark:border-gray-700/50 z-10">
                            <div className="flex items-center cursor-pointer" onClick={() => setShowContactInfo(true)}>
                                <button onClick={(e) => { e.stopPropagation(); setSelectedUser(null); }} className="md:hidden mr-2 text-gray-500">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <img src={selectedUser.avatar} className="w-10 h-10 rounded-full object-cover" />
                                <div className="ml-3">
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{selectedUser.name || selectedUser.username}</h3>
                                    <p className="text-xs text-gray-500 dark:text-[#8696a0]">click for info</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4 text-gray-500 dark:text-[#aebac1]">
                                <ThemeSelector currentTheme={theme} onThemeChange={setTheme} />
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 z-10 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                            {messages.map((msg, idx) => {
                                const isMe = msg.senderId === currentUser.id;
                                return (
                                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] md:max-w-[60%] rounded-lg px-2 py-1.5 shadow-sm relative text-sm ${isMe
                                                ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-900 dark:text-white rounded-tr-none'
                                                : 'bg-white dark:bg-[#202c33] text-gray-900 dark:text-white rounded-tl-none'
                                            }`}>
                                            <p className="mr-8 pb-1 leading-relaxed">{msg.content}</p>
                                            <span className={`text-[10px] absolute bottom-1 right-2 ${isMe ? 'text-gray-500 dark:text-[#8696a0]' : 'text-gray-400 dark:text-[#8696a0]'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="px-4 py-3 bg-gray-100 dark:bg-[#202c33] flex items-center gap-2 z-10">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Type a message"
                                className="flex-1 rounded-lg border-none bg-white dark:bg-[#2a3942] px-4 py-2.5 focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-[#8696a0]"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!newMessage.trim()}
                                className="p-2.5 bg-[#00a884] text-white rounded-full hover:bg-[#008f6f] transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="hidden md:flex flex-col items-center justify-center h-full text-center p-10 border-b-[6px] border-[#25d366]">
                        <h2 className="text-3xl font-light text-gray-700 dark:text-gray-200 mb-2">EIVA Web</h2>
                        <p className="text-sm text-gray-500 dark:text-[#8696a0]">
                            Send and receive messages without keeping your phone online. <br />
                            Use EIVA on up to 4 linked devices and 1 phone.
                        </p>
                        <div className="mt-8 text-xs text-gray-400 dark:text-[#667781] flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
                            End-to-end encrypted
                        </div>
                    </div>
                )}
            </div>

            {/* --- PROFILE MODAL --- */}
            {showProfileModal && (
                <div className="absolute inset-0 z-50 bg-black/60 flex justify-start animate-fade-in">
                    <div className="w-full md:w-96 bg-white dark:bg-[#111b21] h-full flex flex-col animate-slide-in-left">
                        <div className="h-28 bg-[#008069] flex items-end p-4">
                            <div className="flex items-center text-white gap-4 mb-2">
                                <button onClick={() => setShowProfileModal(false)}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                </button>
                                <h2 className="text-xl font-medium">Profile</h2>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-[#f0f2f5] dark:bg-[#111b21] p-4">
                            <div className="flex justify-center my-8">
                                <div className="relative group cursor-pointer">
                                    <img src={currentUser.avatar} className="w-40 h-40 rounded-full object-cover border-4 border-transparent group-hover:opacity-70 transition" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white font-bold text-sm">CHANGE</div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#202c33] p-4 shadow-sm mb-4">
                                <p className="text-[#008069] text-sm font-medium mb-3">Your Name</p>
                                {isEditingProfile ? (
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="w-full bg-transparent border-b-2 border-[#008069] focus:outline-none text-gray-900 dark:text-white py-1"
                                    />
                                ) : (
                                    <div className="flex justify-between">
                                        <p className="text-gray-900 dark:text-white">{currentUser.name}</p>
                                        <button onClick={() => setIsEditingProfile(true)} className="text-[#008069]">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white dark:bg-[#202c33] p-4 shadow-sm mb-4">
                                <p className="text-[#008069] text-sm font-medium mb-3">Username</p>
                                {isEditingProfile ? (
                                    <input
                                        type="text"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        className="w-full bg-transparent border-b-2 border-[#008069] focus:outline-none text-gray-900 dark:text-white py-1"
                                    />
                                ) : (
                                    <div className="flex justify-between">
                                        <p className="text-gray-900 dark:text-white">@{currentUser.username}</p>
                                        <button onClick={() => setIsEditingProfile(true)} className="text-[#008069]">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white dark:bg-[#202c33] p-4 shadow-sm mb-4">
                                <p className="text-[#008069] text-sm font-medium mb-3">Bio</p>
                                {isEditingProfile ? (
                                    <input
                                        type="text"
                                        value={newBio}
                                        onChange={(e) => setNewBio(e.target.value)}
                                        className="w-full bg-transparent border-b-2 border-[#008069] focus:outline-none text-gray-900 dark:text-white py-1"
                                    />
                                ) : (
                                    <div className="flex justify-between">
                                        <p className="text-gray-900 dark:text-white">{currentUser.bio}</p>
                                        <button onClick={() => setIsEditingProfile(true)} className="text-[#008069]">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {isEditingProfile && (
                                <button onClick={handleSaveProfile} className="w-full py-3 bg-[#008069] text-white font-bold rounded-lg shadow-md hover:bg-[#006d59] transition">
                                    Save Changes
                                </button>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* --- CONTACT INFO MODAL --- */}
            {showContactInfo && selectedUser && (
                <div className="absolute inset-0 z-50 bg-black/60 flex justify-end animate-fade-in">
                    <div className="w-full md:w-96 bg-white dark:bg-[#111b21] h-full flex flex-col animate-slide-in-right border-l border-white/10 shadow-2xl">
                        <div className="h-16 bg-[#f0f2f5] dark:bg-[#202c33] flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
                            <button onClick={() => setShowContactInfo(false)} className="text-gray-600 dark:text-[#aebac1] mr-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <h2 className="text-base font-medium text-gray-800 dark:text-white">Contact Info</h2>
                        </div>

                        <div className="overflow-y-auto bg-white dark:bg-[#111b21]">
                            <div className="flex flex-col items-center py-8 bg-white dark:bg-[#111b21] border-b border-gray-100 dark:border-b-[10px] dark:border-[#0b141a]">
                                <img src={selectedUser.avatar} className="w-40 h-40 rounded-full object-cover mb-4" />
                                <h2 className="text-2xl font-medium text-gray-900 dark:text-white">{selectedUser.name}</h2>
                                <p className="text-gray-500 dark:text-[#8696a0]">@{selectedUser.username}</p>
                            </div>

                            <div className="p-4 bg-white dark:bg-[#111b21] border-b border-gray-100 dark:border-b-[10px] dark:border-[#0b141a]">
                                <p className="text-gray-500 dark:text-[#8696a0] text-sm mb-1">About</p>
                                <p className="text-gray-900 dark:text-white text-base">{selectedUser.bio}</p>
                            </div>

                            <div className="p-4 bg-white dark:bg-[#111b21]">
                                <p className="text-gray-500 dark:text-[#8696a0] text-sm mb-4">Groups</p>
                                <div className="text-sm text-gray-400 italic">No groups in common</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default UserChat;
