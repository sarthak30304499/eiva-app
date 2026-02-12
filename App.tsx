

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Question, Comment, ViewState, Space, SearchFilter, AppMode } from './types';
import { generateAIAnswer, ImagePart } from './services/geminiService';
import { supabase } from './supabaseClient';
import {
  listenToAuth,
  listenToPosts,
  listenToFollows,
  listenToUsers,
  createPost,
  updatePostAIAnswer,
  uploadPostImage,
  deletePost,
  toggleVote,
  addCommentToPost,
  toggleFollow,
  getSpacesList,
  getAllUsersList,
  fetchUserProfile,
  logout,
  SYSTEM_EIVA_ID
} from './services/storageService';
import Navbar from './components/Navbar';
import QuestionCard from './components/QuestionCard';
import AskQuestion from './components/AskQuestion';
import LoginPage from './components/LoginPage';
import ModeSelector from './components/ModeSelector';
import AIChat from './components/AIChat';
import UserChat from './components/UserChat';
import { Theme } from './components/ThemeSelector'; // Import Theme type

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
  const [appMode, setAppMode] = useState<AppMode>('choice');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
  const [isAsking, setIsAsking] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [userListConfig, setUserListConfig] = useState<{ title: string; userIds: string[] } | null>(null);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('eiva_theme_mode');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('eiva_elemental_theme');
    return (saved as Theme) || 'space';
  });

  const lastUserIdRef = useRef<string | null>(null);

  const refreshGlobalData = useCallback(() => {
    getSpacesList().then(setSpaces);
    getAllUsersList().then(setAllUsers);
  }, []);

  const refreshSelf = useCallback(async (uid: string) => {
    const updated = await fetchUserProfile(uid);
    if (updated) {
      setLocalUser(updated);
      lastUserIdRef.current = uid;
    }
  }, []);

  useEffect(() => {
    const unsubAuth = listenToAuth((user) => {
      console.log("App.tsx: Auth state changed. User:", user ? user.id : "null");
      setLocalUser(user);
      setIsAuthChecking(false);
      console.log("App.tsx: isAuthChecking set to false");
      if (user) {
        lastUserIdRef.current = user.id;
        refreshGlobalData();
        setAppMode('choice');
      }
    });

    const unsubPosts = listenToPosts((posts) => {
      setQuestions(posts);
    });

    const unsubUsers = listenToUsers(() => {
      refreshGlobalData();
      if (lastUserIdRef.current) refreshSelf(lastUserIdRef.current);
    });

    const unsubFollows = listenToFollows(() => {
      refreshGlobalData();
      if (lastUserIdRef.current) refreshSelf(lastUserIdRef.current);
      if (targetUser) {
        fetchUserProfile(targetUser.id).then(setTargetUser);
      }
    });

    // Failsafe: if auth doesn't respond in 3 seconds, stop loading
    const timer = setTimeout(() => {
      console.log("App.tsx: Auth timeout reached. Forcing load completion.");
      setIsAuthChecking((prev) => {
        if (prev) {
          console.log("App.tsx: Force setting isAuthChecking to false");
          return false;
        }
        return prev;
      });
    }, 3000);

    return () => {
      clearTimeout(timer);
      unsubAuth();
      unsubPosts();
      unsubFollows();
      unsubUsers();
    };
  }, [refreshGlobalData, refreshSelf, targetUser?.id]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('eiva_theme_mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('eiva_theme_mode', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('eiva_elemental_theme', currentTheme);
  }, [currentTheme]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAskQuestion = async (title: string, category: string, file: File | null) => {
    if (!currentUser) return;
    setIsAsking(true);
    const postId = Math.random().toString(36).substr(2, 9);

    try {
      let imageUrl: string | undefined = undefined;
      let imagePart: ImagePart | undefined = undefined;

      if (file) {
        const uploadedUrl = await uploadPostImage(file, postId);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
          });
          imagePart = { inlineData: { data: base64, mimeType: file.type } };
        }
      }

      const newQuestion: Question = {
        id: postId, userId: currentUser.id, userName: currentUser.username,
        userAvatar: currentUser.avatar, title, content: '', aiAnswer: 'EIVA is analyzing your request...',
        imageUrl, likes: [], dislikes: [], comments: [], category: category || 'General',
        createdAt: new Date().toISOString(), isOfficial: currentUser.id === SYSTEM_EIVA_ID
      };
      await createPost(newQuestion);
      const aiAnswer = await generateAIAnswer(title, imagePart);
      await updatePostAIAnswer(postId, aiAnswer.text);
      showToast(imageUrl ? "EIVA analyzed your image!" : "Wisdom synced.");
    } catch (err) {
      console.error(err);
      showToast("Creation failed. Please try again.");
    } finally {
      setIsAsking(false);
    }
  };

  const handleVote = async (id: string, type: 'up' | 'down') => {
    if (!currentUser) return;
    await toggleVote(id, currentUser.id, type);
  };

  const handleAddComment = async (id: string, content: string) => {
    if (!currentUser) return;
    const comment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id, userName: currentUser.username, userAvatar: currentUser.avatar,
      content, createdAt: new Date().toISOString()
    };
    await addCommentToPost(id, comment);
  };

  const handleFollow = async (userId: string) => {
    if (!currentUser) return;
    await toggleFollow(currentUser.id, userId);
  };

  const handleSearch = (q: string, filter: SearchFilter) => {
    setSearchQuery(q);
    setSearchFilter(filter);
    setCurrentView('search');
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await deletePost(id);
      showToast("Post and visual assets removed.");
    } catch (err) {
      console.error(err);
      showToast("Deletion failed. Check permissions.");
    }
  };

  const handleNavigateToUser = async (userId: string) => {
    if (currentUser && userId === currentUser.id) {
      setCurrentView('profile');
      return;
    }
    const user = await fetchUserProfile(userId);
    if (user) {
      setTargetUser(user);
      setCurrentView('user-profile');
    }
  };

  const getFilteredQuestions = () => {
    switch (currentView) {
      case 'following':
        return questions.filter(q => currentUser?.following.includes(q.userId));
      case 'answers':
        return questions.filter(q =>
          q.userId === currentUser?.id ||
          q.comments.some(c => c.userId === currentUser?.id) ||
          q.likes.includes(currentUser?.id || '')
        );
      case 'search':
        if (searchFilter === 'people') return [];
        return questions.filter(q =>
          (searchFilter === 'all' || searchFilter === 'questions') && (
            q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.aiAnswer.toLowerCase().includes(searchQuery.toLowerCase())
          )
        );
      case 'space-detail':
        return questions.filter(q => q.category.toLowerCase() === selectedSpace?.name.toLowerCase());
      case 'user-profile':
        return questions.filter(q => q.userId === targetUser?.id);
      default:
        return questions;
    }
  };

  const getFilteredPeople = () => {
    if (currentView !== 'search' || (searchFilter !== 'all' && searchFilter !== 'people')) return [];
    if (searchQuery.trim() === '') {
      return allUsers.filter(u => u.id !== currentUser?.id).slice(0, 5);
    }
    return allUsers.filter(u =>
      u.id !== currentUser?.id && (
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  };

  if (isAuthChecking) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="animate-spin h-10 w-10 border-4 border-[#6C63FF] border-t-transparent rounded-full"></div>
    </div>
  );

  const handleGuestLogin = () => {
    setLocalUser(GUEST_USER);
    setIsAuthChecking(false);
    setAppMode('choice');
  };

  if (!currentUser) return <LoginPage onLogin={() => {
    // We set auth checking to true to show the spinner while we verify the session
    setIsAuthChecking(true);

    // Safety check: verify session immediately
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        // If user exists, refresh their profile.
        // Importantly, refreshSelf does NOT stop the loading spinner by itself.
        // We must ensure the spinner stops after profile load or if profile load fails.
        refreshSelf(data.user.id).finally(() => {
          // If refreshSelf succeeds (updates localUser), App will re-render with user.
          // If it fails, localUser is null, so we must stop loading to show Login page again (or error).
          // Ideally, if user is authenticated but profile missing (fixed in storageService), we should be good.
          setIsAuthChecking(false);
          setAppMode('choice');
        });
      } else {
        setIsAuthChecking(false);
      }
    }).catch(() => setIsAuthChecking(false));
  }} onGuestLogin={handleGuestLogin} />;

  if (appMode === 'choice') {
    return <ModeSelector user={currentUser} onSelect={setAppMode} />;
  }

  if (appMode === 'ai') {
    return (
      <motion.div
        key="ai-mode"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen transition-colors"
      >
        <Navbar
          user={currentUser}
          currentView={currentView}
          appMode={appMode}
          searchFilter={searchFilter}
          voiceMode={voiceMode}
          onLogout={logout}
          onSearch={handleSearch}
          onSwitchMode={setAppMode}
          onToggleVoiceMode={() => setVoiceMode(!voiceMode)}
          onNavigate={(view) => {
            setCurrentView(view);
            if (view !== 'search') { setSearchQuery(''); setSearchFilter('all'); }
            setUserListConfig(null);
          }}
          isDarkMode={isDarkMode}
          toggleTheme={() => setIsDarkMode(!isDarkMode)}
        />
        <AIChat
          user={currentUser}
          voiceMode={voiceMode}
          onLogout={logout}
          onReturnToChoice={() => setAppMode('choice')}
          theme={currentTheme}
          setTheme={setCurrentTheme}
        />
      </motion.div>
    );
  }

  if (appMode === 'chat') {
    return (
      <motion.div
        key="chat-mode"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <UserChat
          currentUser={currentUser}
          onReturnToChoice={() => setAppMode('choice')}
          theme={currentTheme}
          setTheme={setCurrentTheme}
        />
      </motion.div>
    );
  }

  const displayQuestions = getFilteredQuestions();
  const displayPeople = getFilteredPeople();

  const showUserList = (title: string, userIds: string[]) => {
    setUserListConfig({ title, userIds });
    setCurrentView('user-list');
  };

  return (
    <motion.div
      key="home-mode"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors"
    >
      <Navbar
        user={currentUser}
        currentView={currentView}
        appMode={appMode}
        searchFilter={searchFilter}
        voiceMode={voiceMode}
        onLogout={logout}
        onSearch={handleSearch}
        onSwitchMode={setAppMode}
        onToggleVoiceMode={() => setVoiceMode(!voiceMode)}
        onNavigate={(view) => {
          setCurrentView(view);
          if (view !== 'search') { setSearchQuery(''); setSearchFilter('all'); }
          setUserListConfig(null);
        }}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
      />

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 dark:bg-[#6C63FF] text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center space-x-2 animate-slide-up">
          <svg className="w-5 h-5 text-green-400 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
          <span>{toast}</span>
        </div>
      )}

      <main className="max-w-5xl mx-auto py-6 flex flex-col md:flex-row gap-8 px-4">
        <aside className="hidden lg:block w-48 shrink-0">
          <div className="sticky top-20 space-y-4">
            <button
              onClick={() => setAppMode('ai')}
              className="w-full flex items-center space-x-3 p-3 bg-genz-gradient rounded-2xl text-white shadow-lg hover:scale-105 active:scale-95 transition-all group"
            >
              <span className="text-xl group-hover:rotate-12 transition-transform">✨</span>
              <span className="text-sm font-black tracking-tight">EIVA AI Chat</span>
            </button>

            <div className="space-y-1">
              <div className="pt-2 pb-2 px-2 text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest">Feed</div>
              <button
                onClick={() => { setCurrentView('home'); setUserListConfig(null); }}
                className={`w-full text-left p-2.5 rounded-xl flex items-center space-x-3 text-sm font-bold transition-all ${currentView === 'home' ? 'bg-[#6C63FF] text-white shadow-md' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
              >
                <span className="text-lg">🏠</span> <span>Global Feed</span>
              </button>
              <button
                onClick={() => { setCurrentView('following'); setUserListConfig(null); }}
                className={`w-full text-left p-2.5 rounded-xl flex items-center space-x-3 text-sm font-bold transition-all ${currentView === 'following' ? 'bg-[#6C63FF] text-white shadow-md' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
              >
                <span className="text-lg">👥</span> <span>Following</span>
              </button>
              <button
                onClick={() => { setCurrentView('answers'); setUserListConfig(null); }}
                className={`w-full text-left p-2.5 rounded-xl flex items-center space-x-3 text-sm font-bold transition-all ${currentView === 'answers' ? 'bg-[#6C63FF] text-white shadow-md' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
              >
                <span className="text-lg">✨</span> <span>Activity</span>
              </button>
            </div>

            <div className="space-y-1">
              <div className="pt-4 pb-2 px-2 text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest">Your Spaces</div>
              {spaces.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedSpace(s); setCurrentView('space-detail'); setUserListConfig(null); }}
                  className={`w-full text-left p-2.5 rounded-xl flex items-center space-x-3 text-sm font-bold transition-all ${currentView === 'space-detail' && selectedSpace?.id === s.id ? 'bg-[#6C63FF] text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
                >
                  <span>{s.icon}</span> <span className="truncate">{s.name}</span>
                </button>
              ))}
            </div>

            <div className="pt-8 border-t dark:border-gray-800">
              <button
                onClick={() => setAppMode('choice')}
                className="w-full text-left p-2.5 rounded-xl flex items-center space-x-3 text-xs font-bold text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <span>🔄</span> <span>Change Mode</span>
              </button>
            </div>
          </div>
        </aside>

        <section className="flex-1 max-w-2xl min-h-[80vh]">
          {currentView === 'home' && (
            <AskQuestion
              user={currentUser}
              onAsk={(title, _, file) => handleAskQuestion(title, 'General', file)}
              isLoading={isAsking}
            />
          )}

          {currentView === 'search' && (
            <div className="mb-6 animate-fade-in">
              {displayPeople.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 px-2">
                    {searchQuery ? 'People Matching Search' : 'Discover People'}
                  </h3>
                  <div className="space-y-3">
                    {displayPeople.map(u => (
                      <div key={u.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 shadow-sm flex items-center justify-between hover:border-[#6C63FF]/30 transition-all">
                        <div className="flex items-center space-x-4 cursor-pointer" onClick={() => handleNavigateToUser(u.id)}>
                          <img src={u.avatar} className="w-12 h-12 rounded-full border dark:border-gray-600 object-cover" />
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white leading-tight">@{u.username}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{u.name}</p>
                            {u.bio && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">{u.bio}</p>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleFollow(u.id)}
                          className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${currentUser.following.includes(u.id) ? 'bg-gray-100 dark:bg-gray-700 text-gray-500' : 'bg-[#6C63FF] text-white shadow-lg shadow-[#6C63FF]/20 hover:scale-105'}`}
                        >
                          {currentUser.following.includes(u.id) ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentView === 'user-list' && userListConfig && (
            <div className="animate-fade-in space-y-4">
              {allUsers.filter(u => userListConfig.userIds.includes(u.id)).map(u => (
                <div key={u.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 shadow-sm">
                  <div className="flex items-center space-x-4 cursor-pointer" onClick={() => handleNavigateToUser(u.id)}>
                    <img src={u.avatar} className="w-12 h-12 rounded-full border dark:border-gray-600 object-cover" />
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">@{u.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{u.bio || 'No bio yet'}</p>
                    </div>
                  </div>
                  {currentUser.id !== u.id && (
                    <button
                      onClick={() => handleFollow(u.id)}
                      className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${currentUser.following.includes(u.id) ? 'bg-gray-100 dark:bg-gray-700 text-gray-500' : 'bg-[#6C63FF] text-white'}`}
                    >
                      {currentUser.following.includes(u.id) ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {currentView === 'user-profile' && targetUser && (
            <div className="animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 relative overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 w-full h-24 bg-genz-gradient opacity-20 dark:opacity-40"></div>
                <div className="flex flex-col items-center text-center relative z-10">
                  <img src={targetUser.avatar} className="w-32 h-32 rounded-full border-8 border-white dark:border-gray-800 shadow-xl mb-4 object-cover" />
                  <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter italic flex items-center">
                    @{targetUser.username}
                  </h1>
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{targetUser.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm">{targetUser.bio || 'This user is mysterious...'}</p>

                  <div className="flex space-x-8 mt-6">
                    <button onClick={() => showUserList(`${targetUser.username}'s Followers`, targetUser.followers)} className="text-center group">
                      <p className="text-xl font-black text-[#6C63FF] group-hover:underline">{targetUser.followers.length}</p>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Followers</p>
                    </button>
                    <button onClick={() => showUserList(`${targetUser.username}'s Following`, targetUser.following)} className="text-center group">
                      <p className="text-xl font-black text-[#6C63FF] group-hover:underline">{targetUser.following.length}</p>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Following</p>
                    </button>
                  </div>

                  <button
                    onClick={() => handleFollow(targetUser.id)}
                    className={`mt-6 px-8 py-2 rounded-full font-black transition-all ${currentUser.following.includes(targetUser.id) ? 'bg-gray-100 dark:bg-gray-700 text-gray-500' : 'bg-[#6C63FF] text-white shadow-lg shadow-[#6C63FF]/30 scale-105'}`}
                  >
                    {currentUser.following.includes(targetUser.id) ? 'Following' : 'Follow'}
                  </button>

                  <hr className="w-full my-8 border-gray-100 dark:border-gray-700" />

                  <div className="w-full text-left">
                    <div className="flex space-x-6 border-b dark:border-gray-700 mb-6">
                      <button className="pb-3 border-b-2 border-[#6C63FF] text-[#6C63FF] font-black text-sm uppercase tracking-widest">Posts</button>
                    </div>

                    <div className="space-y-4">
                      {displayQuestions.map(q => (
                        <QuestionCard
                          key={q.id} question={q} currentUser={currentUser}
                          onVote={handleVote} onComment={handleAddComment}
                          onFollow={handleFollow} onDelete={handleDeleteQuestion}
                          onNavigateToUser={handleNavigateToUser}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView !== 'profile' && currentView !== 'user-list' && currentView !== 'user-profile' && (
            <div className="space-y-4">
              {displayQuestions.map(q => (
                <QuestionCard
                  key={q.id} question={q} currentUser={currentUser}
                  onVote={handleVote} onComment={handleAddComment}
                  onFollow={handleFollow} onDelete={handleDeleteQuestion}
                  onNavigateToUser={handleNavigateToUser}
                />
              ))}
            </div>
          )}

          {currentView === 'profile' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 relative overflow-hidden transition-colors">
              <div className="absolute top-0 left-0 w-full h-24 bg-genz-gradient opacity-20 dark:opacity-40"></div>
              <div className="flex flex-col items-center text-center relative z-10">
                <img src={currentUser.avatar} className="w-32 h-32 rounded-full border-8 border-white dark:border-gray-800 shadow-xl mb-4 object-cover" />
                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter italic flex items-center">
                  @{currentUser.username}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{currentUser.email}</p>
                <div className="flex space-x-8 mt-6">
                  <button onClick={() => showUserList('Followers', currentUser.followers)} className="text-center group">
                    <p className="text-xl font-black text-[#6C63FF] group-hover:underline">{currentUser.followers.length}</p>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Followers</p>
                  </button>
                  <button onClick={() => showUserList('Following', currentUser.following)} className="text-center group">
                    <p className="text-xl font-black text-[#6C63FF] group-hover:underline">{currentUser.following.length}</p>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Following</p>
                  </button>
                </div>
                <hr className="w-full my-8 border-gray-100 dark:border-gray-700" />
                <div className="w-full text-left">
                  <h2 className="text-xl font-black mb-6 text-gray-900 dark:text-white">Your Contributions</h2>
                  <div className="space-y-4">
                    {questions.filter(q => q.userId === currentUser.id).map(q => (
                      <QuestionCard
                        key={q.id} question={q} currentUser={currentUser}
                        onVote={handleVote} onComment={handleAddComment}
                        onFollow={handleFollow} onDelete={handleDeleteQuestion}
                        onNavigateToUser={handleNavigateToUser}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="hidden md:block w-72 shrink-0">
          <div className="sticky top-20 space-y-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 shadow-sm transition-colors">
              <h3 className="font-black text-gray-900 dark:text-white mb-4 border-b dark:border-gray-700 pb-2 flex items-center justify-between">
                <span>Trending Feed</span>
                <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-500 px-2 py-0.5 rounded-full">LIVE</span>
              </h3>
              <ul className="space-y-4">
                {questions.slice(0, 3).map(q => (
                  <li key={q.id} className="group cursor-pointer" onClick={() => handleSearch(q.title, 'all')}>
                    <p className="text-[10px] font-black text-[#6C63FF] uppercase">{q.category}</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-[#6C63FF] transition-colors line-clamp-2 leading-snug">"{q.title}"</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </main>
    </motion.div>
  );
};

export default App;
