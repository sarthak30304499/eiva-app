
import React, { useState, useRef, useEffect } from 'react';
import { Question, Comment, User } from '../types';
import { generateSpeech, decodeAudioData } from '../services/geminiService';

interface QuestionCardProps {
  question: Question;
  currentUser: User | null;
  onVote: (id: string, type: 'up' | 'down') => void;
  onComment: (id: string, content: string) => void;
  onFollow: (userId: string) => void;
  onDelete: (id: string) => void;
  onNavigateToUser?: (userId: string) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ 
  question, 
  currentUser, 
  onVote, 
  onComment, 
  onFollow, 
  onDelete,
  onNavigateToUser
}) => {
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [activeVoteType, setActiveVoteType] = useState<'up' | 'down' | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onComment(question.id, commentText);
      setCommentText('');
    }
  };

  const hasUpvoted = currentUser ? question.likes.includes(currentUser.id) : false;
  const hasDownvoted = currentUser ? question.dislikes.includes(currentUser.id) : false;
  const isOwner = currentUser?.id === question.userId;
  const isFollowing = currentUser?.following.includes(question.userId);

  const handleVoteClick = (type: 'up' | 'down') => {
    setActiveVoteType(type);
    onVote(question.id, type);
    setTimeout(() => setActiveVoteType(null), 300);
  };

  const handleDeleteClick = () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      onDelete(question.id);
      setShowMenu(false);
    }
  };

  const handleSpeak = async () => {
    if (isPlaying) {
      audioSourceRef.current?.stop();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    const speechData = await generateSpeech(question.aiAnswer);
    if (!speechData) {
      setIsPlaying(false);
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const buffer = await decodeAudioData(speechData, audioContextRef.current);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => setIsPlaying(false);
    source.start();
    audioSourceRef.current = source;
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 mb-4 shadow-sm hover:shadow-md transition-all animate-fade-in relative group">
      {isLightboxOpen && question.imageUrl && (
        <div 
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          <img src={question.imageUrl} className="max-w-full max-h-full rounded-lg shadow-2xl" alt="Full view" />
          <button className="absolute top-4 right-4 text-white hover:scale-110 transition-transform">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {question.isOfficial && (
        <div className="mb-2 flex items-center space-x-1.5">
          <span className="flex items-center text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full tracking-wider animate-pulse">
            🔴 EIVA OFFICIAL POST
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <img 
            src={question.userAvatar} 
            alt="" 
            className="w-10 h-10 rounded-full object-cover border dark:border-gray-700 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => onNavigateToUser?.(question.userId)}
          />
          <div>
            <div className="flex items-center space-x-2">
              <p 
                className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center cursor-pointer hover:text-[#6C63FF] transition-colors"
                onClick={() => onNavigateToUser?.(question.userId)}
              >
                {question.userName}
                {question.isOfficial && (
                  <svg className="w-3.5 h-3.5 ml-1 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </p>
              {!isOwner && currentUser && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <button 
                    onClick={() => onFollow(question.userId)}
                    className={`text-xs font-bold ${isFollowing ? 'text-gray-400 dark:text-gray-500' : 'text-[#6C63FF] hover:underline'}`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </>
              )}
            </div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              {new Date(question.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
            {question.category}
          </div>
          
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors rounded-full hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl z-20 overflow-hidden py-1 animate-slide-up">
                {isOwner && (
                  <button 
                    onClick={handleDeleteClick}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Post</span>
                  </button>
                )}
                <button 
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  onClick={() => { alert('Post link copied to clipboard!'); setShowMenu(false); }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Share link</span>
                </button>
                <button 
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  onClick={() => setShowMenu(false)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 mb-3 leading-snug group-hover:text-[#6C63FF] transition-colors">"{question.title}"</h2>
      
      {question.imageUrl && (
        <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all">
          <img 
            src={question.imageUrl} 
            className="w-full h-auto max-h-[400px] object-cover cursor-zoom-in" 
            alt="Question visual" 
            onClick={() => setIsLightboxOpen(true)}
          />
        </div>
      )}

      <div className="bg-[#F5F7FF] dark:bg-gray-700/50 border-l-4 border-[#6C63FF] p-4 rounded-r-xl mb-4 relative overflow-hidden group transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-[#6C63FF] animate-pulse">✨</span>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#6C63FF]">🔴 Gemini AI Answer</p>
          </div>
          <button 
            onClick={handleSpeak}
            className={`p-1 rounded-full transition-all ${isPlaying ? 'bg-[#6C63FF] text-white animate-pulse' : 'text-[#6C63FF] hover:bg-[#6C63FF]/10'}`}
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
        </div>
        <div className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
          {question.aiAnswer}
        </div>
      </div>

      <div className="flex items-center justify-between border-t dark:border-gray-700 pt-3">
        <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-full p-1 border border-gray-100 dark:border-gray-600 transition-colors">
          <button 
            onClick={() => handleVoteClick('up')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-full transition-all ${
              hasUpvoted ? 'bg-[#6C63FF] text-white shadow-md' : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
            } ${activeVoteType === 'up' ? 'scale-110' : ''}`}
          >
            <svg className="w-5 h-5" fill={hasUpvoted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <span className="text-xs font-bold">{question.likes.length}</span>
          </button>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1"></div>
          <button 
            onClick={() => handleVoteClick('down')}
            className={`p-1.5 rounded-full transition-all ${
              hasDownvoted ? 'bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400' : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
            } ${activeVoteType === 'down' ? 'scale-110' : ''}`}
          >
            <svg className="w-5 h-5" fill={hasDownvoted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center space-x-6">
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-[#6C63FF] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs font-bold">{question.comments.length}</span>
          </button>
          <button className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 animate-slide-up transition-colors">
          <form onSubmit={handleCommentSubmit} className="flex space-x-3 mb-6">
            <img 
              src={currentUser?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest'} 
              className="w-8 h-8 rounded-full shadow-inner border dark:border-gray-700 cursor-pointer" 
              onClick={() => currentUser && onNavigateToUser?.(currentUser.id)}
            />
            <input 
              type="text" 
              placeholder="Add a comment..." 
              className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#6C63FF] transition-all text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button 
              type="submit"
              className="text-[#6C63FF] font-black text-sm hover:underline"
            >
              Post
            </button>
          </form>

          <div className="space-y-4">
            {question.comments.map(comment => (
              <div key={comment.id} className="flex space-x-3 group/comment">
                <img 
                  src={comment.userAvatar} 
                  alt="" 
                  className="w-8 h-8 rounded-full border dark:border-gray-700 shadow-sm shrink-0 cursor-pointer hover:opacity-80" 
                  onClick={() => onNavigateToUser?.(comment.userId)}
                />
                <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-2xl p-3 border border-transparent group-hover/comment:border-gray-100 dark:group-hover/comment:border-gray-600 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <p 
                      className="text-xs font-black text-gray-900 dark:text-gray-100 cursor-pointer hover:text-[#6C63FF]"
                      onClick={() => onNavigateToUser?.(comment.userId)}
                    >
                      {comment.userName}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tight">{new Date(comment.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{comment.content}</p>
                </div>
              </div>
            ))}
            {question.comments.length === 0 && (
              <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-4 font-bold uppercase tracking-widest opacity-60">No comments yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
