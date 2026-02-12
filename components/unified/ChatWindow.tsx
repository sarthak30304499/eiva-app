import React, { useState, useRef, useEffect } from 'react';
import MessageBubble, { Message } from './MessageBubble';
import { Paperclip, Mic, Send, Smile, Phone, Video, MoreVertical, X } from 'lucide-react';
import { User } from '../../types';
import { AnimatePresence, motion } from 'framer-motion';

interface ChatWindowProps {
    chatPartner: User | 'eiva';
    messages: Message[];
    onSendMessage: (text: string, attachments?: File[]) => void;
    isTyping?: boolean;
    headerActions?: React.ReactNode;
}

const Toast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
    <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center space-x-2 z-50"
    >
        <span>{message}</span>
        <button onClick={onClose}><X size={14} /></button>
    </motion.div>
);

const ChatWindow: React.FC<ChatWindowProps> = ({
    chatPartner,
    messages,
    onSendMessage,
    isTyping,
}) => {
    const [inputText, setInputText] = useState('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleSend = () => {
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            onSendMessage('', [file]); // Send immediately for now or add to preview
            // For professional UI, usually we show preview. 
            // Given constraints, immediate send (which uploads/processes) is acceptable first step, 
            // but let's at least show we are sending.
            showToast(`Sending ${file.name}...`);
        }
    };

    const isEiva = chatPartner === 'eiva';
    const name = isEiva ? 'EIVA AI' : chatPartner.name;
    const avatar = isEiva
        ? 'https://ui-avatars.com/api/?name=AI&background=3b82f6&color=fff' // Placeholder or use local asset
        : chatPartner.avatar;
    const status = isEiva ? 'Online' : 'Last seen recently';

    return (
        <div className="flex flex-col h-full relative bg-[#f0f2f5] dark:bg-[#0b141a]"> {/* WhatsApp-ish background */}
            <AnimatePresence>
                {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
            </AnimatePresence>

            {/* Header */}
            <div className="h-16 px-4 bg-white dark:bg-[#1c1c1e] border-b border-gray-200 dark:border-white/5 flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 p-2 rounded-lg transition-colors">
                    {/* Mobile Back Button spacer - handled by layout overlay usually, but good to have explicit if needed */}
                    <img
                        src={avatar}
                        alt={name}
                        className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10"
                    />
                    <div>
                        <h2 className="font-semibold text-gray-900 dark:text-white leading-tight">{name}</h2>
                        <p className="text-xs text-blue-500">{status}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 text-blue-500">
                    <button
                        onClick={() => showToast("Video calls coming soon!")}
                        className="hover:bg-blue-50 dark:hover:bg-white/5 p-2 rounded-full transition-colors"
                        title="Video Call"
                    >
                        <Video size={20} />
                    </button>
                    <button
                        onClick={() => showToast("Voice calls coming soon!")}
                        className="hover:bg-blue-50 dark:hover:bg-white/5 p-2 rounded-full transition-colors"
                        title="Voice Call"
                    >
                        <Phone size={20} />
                    </button>
                    <button
                        onClick={() => showToast("More options coming soon!")}
                        className="hover:bg-blue-50 dark:hover:bg-white/5 p-2 rounded-full transition-colors"
                        title="More"
                    >
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-[url('https://camo.githubusercontent.com/857e5e334df51633535206c888d3d922579b76c8cb81561da40177726de306ba/68747470733a2f2f7765622e77686174736170702e636f6d2f696d672f62672d636861742d74696c652d6461726b5f61346265353132653731393562366237333364393131306234303866303735642e706e67')] bg-repeat bg-center opacity-95 dark:opacity-100 dark:bg-blend-overlay">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
                {isTyping && (
                    <div className="flex justify-start mb-2">
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-100 dark:border-white/5 shadow-sm flex items-center space-x-2">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-[#1c1c1e] border-t border-gray-200 dark:border-white/5">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*"
                />
                <div className="flex items-end space-x-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-gray-500 hover:text-blue-500 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
                        title="Attach File"
                    >
                        <Paperclip size={24} />
                    </button>
                    <div className="flex-1 bg-gray-100 dark:bg-[#2c2c2e] rounded-2xl flex items-center border border-transparent focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message..."
                            className="w-full px-4 py-3 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500 max-h-32 overflow-y-auto"
                        />
                        <button
                            onClick={() => showToast("Emoji picker coming soon!")}
                            className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                            <Smile size={24} />
                        </button>
                    </div>
                    {inputText.trim() ? (
                        <button
                            onClick={handleSend}
                            className="p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-transform transform active:scale-95"
                        >
                            <Send size={20} className="ml-0.5" />
                        </button>
                    ) : (
                        <button
                            onClick={() => showToast("Voice message coming soon!")}
                            className="p-3 text-gray-500 hover:text-blue-500 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
                        >
                            <Mic size={24} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;
