import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { searchUsers, fetchMessages, sendMessage, listenToMessages, getAllUsersList } from '../services/storageService';

interface UserChatProps {
    currentUser: User;
    onReturnToChoice: () => void;
}

const UserChat: React.FC<UserChatProps> = ({ currentUser, onReturnToChoice }) => {
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

    return (
        <div className="flex h-[calc(100vh-56px)] bg-gray-100 dark:bg-gray-900 font-['Plus_Jakarta_Sans'] overflow-hidden">

            {/* Sidebar (User List) */}
            <div className={`w-full md:w-80 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col ${selectedUser ? 'hidden md:flex' : 'flex'}`}>

                {/* Sidebar Header */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Chats</h2>
                    <button onClick={onReturnToChoice} className="text-sm text-[#6C63FF] hover:underline font-bold">Exit</button>
                </div>

                {/* Search */}
                <div className="p-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search people..."
                            className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 border-none focus:ring-2 focus:ring-[#6C63FF] text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto">
                    {searchResults.map(user => (
                        <div
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedUser?.id === user.id ? 'bg-purple-50 dark:bg-gray-700' : ''}`}
                        >
                            <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
                            <div className="ml-3 flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate">{user.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
                            </div>
                        </div>
                    ))}
                    {searchResults.length === 0 && (
                        <div className="p-4 text-center text-gray-500 text-sm">No users found.</div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>

                {selectedUser ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-3 bg-white dark:bg-gray-800 flex items-center shadow-sm z-10 sticky top-0">
                            <button onClick={() => setSelectedUser(null)} className="md:hidden mr-2 text-gray-500">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <img src={selectedUser.avatar} className="w-10 h-10 rounded-full" />
                            <div className="ml-3">
                                <h3 className="font-semibold text-gray-900 dark:text-white">{selectedUser.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">@{selectedUser.username}</p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://camo.githubusercontent.com/854a93c27d64274c4f8c5a6b30a0d0d84429df345a95d7328fd459200bd1795c/68747470733a2f2f7765622e77686174736170702e636f6d2f696d672f62672d636861742d74696c652d6461726b5f61346265353132653731393562366237333364393131303234303838396634342e706e67')] bg-repeat opacity-90">
                            {messages.map((msg, idx) => {
                                const isMe = msg.senderId === currentUser.id;
                                return (
                                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] rounded-lg p-2 shadow-sm relative text-sm ${isMe ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-900 dark:text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none'
                                            }`}>
                                            <p>{msg.content}</p>
                                            <p className={`text-[9px] text-right mt-1 ${isMe ? 'text-green-800 dark:text-green-200' : 'text-gray-400'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white dark:bg-gray-800 flex items-center gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Type a message"
                                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 px-4 py-2 focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none"
                            />
                            <button
                                onClick={handleSend}
                                className="p-3 bg-[#6C63FF] text-white rounded-full hover:bg-purple-700 transition"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-10 opacity-60">
                        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
                            <span className="text-4xl">💬</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">Eiva Chat for Web</h2>
                        <p className="mt-4 text-gray-500 dark:text-gray-400 max-w-md">
                            Send and receive messages with your friends. Select a user from the sidebar to start chatting.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserChat;
