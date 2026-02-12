import React, { ReactNode } from 'react';

interface ChatLayoutProps {
    sidebar: ReactNode;
    chatWindow: ReactNode;
    isMobileSidebarOpen: boolean;
    onCloseMobileSidebar: () => void;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
    sidebar,
    chatWindow,
    isMobileSidebarOpen,
    onCloseMobileSidebar,
}) => {
    return (
        <div className="flex h-screen bg-white dark:bg-[#1c1c1e] overflow-hidden font-sans text-gray-900 dark:text-white">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex w-80 md:w-96 flex-col border-r border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#2c2c2e]/50 backdrop-blur-xl">
                {sidebar}
            </div>

            {/* Mobile Sidebar (Slide-over) */}
            <div
                className={`fixed inset-y-0 left-0 z-50 w-80 bg-gray-50 dark:bg-[#1c1c1e] shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {sidebar}
            </div>

            {/* Mobile Overlay */}
            {isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                    onClick={onCloseMobileSidebar}
                />
            )}

            {/* Main Chat Area */}
            <main className="flex-1 relative flex flex-col h-full overflow-hidden bg-[#e5ddd5] dark:bg-[#000000]">
                {/* Background Wallpaper Pattern (Optional - can be added via CSS) */}
                <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                {chatWindow}
            </main>
        </div>
    );
};

export default ChatLayout;
