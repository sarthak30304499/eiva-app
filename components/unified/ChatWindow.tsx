import React, { useState, useRef, useEffect } from 'react';
import MessageBubble, { Message } from './MessageBubble';
import { Paperclip, Mic, Send, Smile, Phone, Video, MoreVertical } from 'lucide-react';
import { User } from '../../types';

interface ChatWindowProps {
    chatPartner: User | 'eiva';
    messages: Message[];
    onSendMessage: (text: string, attachments?: File[]) => void;
    isTyping?: boolean;
    headerActions?: React.ReactNode;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
    chatPartner,
    messages,
    onSendMessage,
    isTyping,
}) => {
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

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

    const isEiva = chatPartner === 'eiva';
    const name = isEiva ? 'EIVA AI' : chatPartner.name;
    const avatar = isEiva
        ? 'https://ui-avatars.com/api/?name=AI&background=3b82f6&color=fff' // Placeholder or use local asset
        : chatPartner.avatar;
    const status = isEiva ? 'Online' : 'Last seen recently';

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="h-16 px-4 bg-white dark:bg-[#1c1c1e] border-b border-gray-200 dark:border-white/5 flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center space-x-3 cursor-pointer">
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
                <div className="flex items-center space-x-4 text-blue-500">
                    <button className="hover:bg-blue-50 dark:hover:bg-white/5 p-2 rounded-full transition-colors"><Video size={20} /></button>
                    <button className="hover:bg-blue-50 dark:hover:bg-white/5 p-2 rounded-full transition-colors"><Phone size={20} /></button>
                    <button className="hover:bg-blue-50 dark:hover:bg-white/5 p-2 rounded-full transition-colors"><MoreVertical size={20} /></button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
                {isTyping && (
                    <div className="flex justify-start mb-2 animate-pulse">
                        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-100 dark:border-white/5">
                            <span className="text-sm text-gray-500">Typing...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#f0f2f5] dark:bg-[#1c1c1e] border-t border-gray-200 dark:border-white/5">
                <div className="flex items-end space-x-2">
                    <button className="p-3 text-gray-500 hover:text-blue-500 transition-colors">
                        <Paperclip size={24} />
                    </button>
                    <div className="flex-1 bg-white dark:bg-[#2c2c2e] rounded-2xl flex items-center border border-gray-200 dark:border-white/10 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all shadow-sm">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message..."
                            className="w-full px-4 py-3 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500 max-h-32 overflow-y-auto"
                        />
                        <button className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
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
                        <button className="p-3 text-gray-500 hover:text-blue-500 transition-colors">
                            <Mic size={24} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;
