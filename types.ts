
export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  bio: string;
  avatar: string; // Maps to profile_pic in DB
  joinedAt: string;
  following: string[]; // Aggregated from follows table
  followers: string[]; // Aggregated from follows table
  isVerified?: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string; // Maps to text in DB
  createdAt: string;
}

export interface Question {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  title: string; // Maps to question in DB
  content: string;
  aiAnswer: string; // Maps to ai_answer in DB
  imageUrl?: string; // Maps to image_url in DB
  likes: string[]; // List of User IDs who liked
  dislikes: string[]; // List of User IDs who disliked
  comments: Comment[];
  category: string; // Maps to space in DB
  createdAt: string;
  isOfficial?: boolean;
}

export interface Space {
  id: string;
  name: string;
  description: string;
  icon?: string;
  members: string[];
}

export type SearchFilter = 'all' | 'people' | 'questions' | 'spaces';

export type AppMode = 'choice' | 'ai' | 'chat' | 'browser';

export type ViewState = 'home' | 'following' | 'answers' | 'spaces' | 'profile' | 'search' | 'space-detail' | 'user-list' | 'user-profile' | 'mode-selector' | 'ai-chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  // Fix: Making text optional to allow message parts that consist solely of inlineData (images)
  parts: { text?: string; inlineData?: { data: string; mimeType: string } }[];
  timestamp: string;
  // Added sources for grounding
  sources?: any[];
  agentName?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}
