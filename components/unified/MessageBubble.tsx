import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface Message {
    id: string;
    text: string;
    sender: 'me' | 'other' | 'system';
    timestamp: Date;
    senderName?: string;
    senderAvatar?: string;
    attachments?: { type: 'image' | 'file'; url: string; name?: string }[];
}

interface MessageBubbleProps {
    message: Message;
    showAvatar?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, showAvatar = true }) => {
    const isMe = message.sender === 'me';
    const isSystem = message.sender === 'system';

    if (isSystem) {
        return (
            <div className="flex justify-center my-4">
                <span className="bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full">
                    {message.text}
                </span>
            </div>
        );
    }

    return (
        <div className={`flex w-full mb-2 ${isMe ? 'justify-end' : 'justify-start'} group`}>
            {/* Avatar (Left for others) */}
            {!isMe && showAvatar && (
                <div className="flex-shrink-0 mr-2 self-end">
                    {message.senderAvatar ? (
                        <img src={message.senderAvatar} alt={message.senderName} className="w-8 h-8 rounded-full" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs">?</div>
                    )}
                </div>
            )}

            {/* Spacer if no avatar but 'other' to align messages */}
            {!isMe && !showAvatar && <div className="w-10" />}

            <div
                className={`max-w-[70%] md:max-w-[60%] relative px-4 py-2 shadow-sm ${isMe
                    ? 'bg-[#effdde] dark:bg-[#005c4b] rounded-2xl rounded-tr-sm text-gray-900 dark:text-white' // Whatsapp/Telegram style Green for me
                    : 'bg-white dark:bg-[#1c1c1e] rounded-2xl rounded-tl-sm text-gray-900 dark:text-white border border-gray-100 dark:border-white/5' // White/Dark for others
                    }`}
            >
                {/* Sender Name (only for others in groups, but good to have) */}
                {!isMe && message.senderName && (
                    <p className="text-xs font-bold text-blue-500 mb-1">{message.senderName}</p>
                )}

                {/* Text Content */}
                <div className={`markdown-content text-[15px] leading-relaxed break-words ${isMe ? 'text-gray-900 dark:text-gray-100' : 'text-gray-900 dark:text-gray-100'}`}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({ node, ...props }) => <p className="mb-0" {...props} />,
                            a: ({ node, ...props }) => <a className="text-blue-500 hover:underline" target="_blank" {...props} />,
                            code: ({ node, inline, className, children, ...props }: any) => {
                                return inline
                                    ? <code className="bg-black/10 dark:bg-black/20 px-1 py-0.5 rounded text-sm" {...props}>{children}</code>
                                    : <div className="my-2 bg-black/80 text-white p-3 rounded-lg overflow-x-auto text-xs"><code {...props}>{children}</code></div>
                            },
                        }}
                    >
                        {message.text}
                    </ReactMarkdown>
                </div>

                {/* Attachments (Placeholder) */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                        {message.attachments.map((att, idx) => (
                            <div key={idx} className="rounded-lg overflow-hidden border border-gray-200 dark:border-white/10">
                                {att.type === 'image' ? (
                                    <img src={att.url} alt="attachment" className="max-w-full h-auto" />
                                ) : (
                                    <div className="p-3 bg-gray-50 dark:bg-white/5 flex items-center space-x-2">
                                        <span className="text-xs">{att.name || 'File'}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Timestamp & Status */}
                <div className={`flex items-center justify-end space-x-1 mt-1 ${isMe ? 'text-[#59d0a6]' : 'text-gray-400'}`}>
                    <span className="text-[10px] opacity-70">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                        <span>
                            {/* Double check icon can go here */}
                            <svg viewBox="0 0 16 11" width="16" height="11" fill="currentColor" className="w-3 h-3 text-blue-400"><path d="M10.7 0.7l-5.6 5.6-2.4-2.4-1.4 1.4 3.8 3.8 7-7z" /><path d="M15.7 0.7l-5.6 5.6-2.4-2.4-1.4 1.4 3.8 3.8 7-7z" /></svg>
                        </span>
                    )}
                </div>

            </div>
        </div>
    );
};

export default MessageBubble;
