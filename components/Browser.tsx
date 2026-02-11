
import React, { useState } from 'react';
import { User } from '../types';

interface BrowserProps {
    user: User | null;
    onReturnToChoice: () => void;
}

const Browser: React.FC<BrowserProps> = ({ user, onReturnToChoice }) => {
    const [query, setQuery] = useState('');
    const [url, setUrl] = useState('');

    const isValidUrl = (string: string) => {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        let targetUrl = query.trim();

        // Simple heuristic to detect if it's likely a URL
        const isUrlLike = targetUrl.includes('.') && !targetUrl.includes(' ');

        if (isUrlLike) {
            if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                targetUrl = 'https://' + targetUrl;
            }
            if (isValidUrl(targetUrl)) {
                setUrl(targetUrl);
                return;
            }
        }

        // Default to DuckDuckGo search
        setUrl(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&ia=web`);
    };

    const openInNewTab = () => {
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            {/* Header / Address Bar */}
            <div className="bg-white dark:bg-gray-800 p-4 shadow-md flex items-center space-x-4 border-b dark:border-gray-700 z-10">
                <button
                    onClick={onReturnToChoice}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
                    title="Back to Home"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                </button>

                <div className="flex items-center space-x-2">
                    <span className="text-2xl">🌐</span>
                    <h1 className="font-black text-lg tracking-tight text-gray-800 dark:text-gray-200 hidden md:block">EIVA Browser</h1>
                </div>

                <form onSubmit={handleSearch} className="flex-1 flex items-center max-w-2xl mx-auto space-x-2">
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full leading-5 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#6C63FF] focus:ring-1 focus:ring-[#6C63FF] sm:text-sm transition-all shadow-inner"
                            placeholder="Enter URL (e.g., www.youtube.com) or search..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="hidden sm:block p-2 bg-[#6C63FF] text-white rounded-full">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                </form>

                <div className="flex items-center space-x-2">
                    {url && (
                        <button
                            onClick={openInNewTab}
                            className="p-2 text-gray-500 hover:text-[#6C63FF] transition-colors"
                            title="Open in New Tab (if site fails to load)"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </button>
                    )}
                    {user && (
                        <img src={user.avatar} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600" title={user.username} />
                    )}
                </div>
            </div>

            {/* Browser Content */}
            <div className="flex-1 overflow-hidden relative bg-white dark:bg-gray-900">
                {url ? (
                    <div className="w-full h-full flex flex-col">
                        {url.includes('youtube.com') && !url.includes('embed') && (
                            <div className="bg-yellow-50 text-yellow-800 text-xs p-2 text-center">
                                Note: Many major sites like YouTube may block embedding. If it doesn't load, use the "Open in New Tab" button.
                            </div>
                        )}
                        <iframe
                            src={url}
                            className="w-full h-full border-none flex-1"
                            title="Web Content"
                            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                            allowFullScreen
                        />
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in opacity-60">
                        <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 animate-float">
                            <span className="text-6xl">🌐</span>
                        </div>
                        <h2 className="text-3xl font-black text-gray-800 dark:text-gray-200 mb-2">Eiva Browser</h2>
                        <p className="max-w-md text-gray-500 dark:text-gray-400">
                            Enter a URL or search query to browse.
                        </p>
                    </div>
                )}
            </div>

            <div className="bg-gray-100 dark:bg-gray-800 p-2 text-center text-[10px] text-gray-400 font-mono border-t dark:border-gray-700">
                SECURE BROWSER • {new Date().toLocaleDateString()}
            </div>
        </div>
    );
};

export default Browser;
