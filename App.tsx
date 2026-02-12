import React, { useState, useEffect } from 'react';
import { User } from './types';
import { listenToAuth, fetchUserProfile, logout, listenToUsers } from './services/storageService'; // Added listenToUsers
import ChatLayout from './components/unified/ChatLayout';
import Sidebar from './components/unified/Sidebar';
import AIChat from './components/AIChat';
import UserChat from './components/UserChat';
import LoginPage from './components/LoginPage';
import { Theme } from './components/ThemeSelector';
import { MessageSquare } from 'lucide-react';

const GUEST_USER: User = {
  id: 'guest_user',
  name: 'Guest Traveler',
  username: 'guest',
  email: 'guest@eiva.ai',
  bio: 'Exploring the EIVA universe.',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest',
  joinedAt: new Date().toISOString(),
  following: [],
  followers: []
};

const App: React.FC = () => {
  const [currentUser, setLocalUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [selectedChat, setSelectedChat] = useState<User | 'eiva' | null>('eiva'); // Default to AI
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('eiva_elemental_theme');
    return (saved as Theme) || 'space';
  });

  // Auth Listener
  useEffect(() => {
    const unsubAuth = listenToAuth(async (user) => {
      setLocalUser(user);
      setIsAuthChecking(false);
      if (user) {
        // Ensure profile is up to date
        const profile = await fetchUserProfile(user.id);
        if (profile) setLocalUser(profile);
      }
    });
    return () => unsubAuth();
  }, []);

  // Fetch Users for sidebard
  // Fetch Users for sidebar
  useEffect(() => {
    if (currentUser) {
      const unsubUsers = listenToUsers((fetchedUsers) => {
        setUsers(fetchedUsers.filter(u => u.id !== currentUser.id));
      });
      return () => { unsubUsers(); };
    }
  }, [currentUser]);

  // Theme Persistence
  useEffect(() => {
    localStorage.setItem('eiva_elemental_theme', currentTheme);
  }, [currentTheme]);

  const handleSelectChat = (chat: User | 'eiva') => {
    setSelectedChat(chat);
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setLocalUser(null);
  };

  if (isAuthChecking) return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b141a] flex items-center justify-center">
      <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  );

  if (!currentUser) return <LoginPage onLogin={() => setIsAuthChecking(true)} onGuestLogin={() => {
    setLocalUser(GUEST_USER);
    setIsAuthChecking(false);
  }} />;

  // Render Sidebar Content
  const sidebarContent = (
    <Sidebar
      currentUser={currentUser}
      selectedChatId={typeof selectedChat === 'string' ? selectedChat : selectedChat?.id || null}
      onSelectChat={handleSelectChat}
      users={users}
      onLogout={handleLogout}
      currentTheme={currentTheme}
      onThemeChange={setCurrentTheme}
    />
  );

  // Render Main Chat Content
  let chatContent;
  if (selectedChat === 'eiva') {
    chatContent = (
      <AIChat
        user={currentUser}
        voiceMode={false}
        onLogout={handleLogout}
        theme={currentTheme}
        setTheme={setCurrentTheme}
      />
    );
  } else if (selectedChat && typeof selectedChat === 'object') {
    chatContent = (
      <UserChat
        currentUser={currentUser}
        chatPartner={selectedChat}
        onBack={() => setIsMobileSidebarOpen(true)}
        theme={currentTheme}
        setTheme={setCurrentTheme}
      />
    );
  } else {
    chatContent = (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-500">
        <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
          <MessageSquare size={48} className="opacity-50" />
        </div>
        <p>Select a chat to start messaging.</p>
      </div>
    );
  }

  return (
    <ChatLayout
      sidebar={sidebarContent}
      chatWindow={chatContent}
      isMobileSidebarOpen={isMobileSidebarOpen}
      onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
    />
  );
};

export default App;
