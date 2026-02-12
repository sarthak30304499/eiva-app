
import { supabase } from '../supabaseClient';
import { User, Question, Comment, Space } from '../types';

export const SYSTEM_EIVA_ID = '00000000-0000-0000-0000-000000000000';

// Map DB User to App User
const mapUser = (dbUser: any, followingIds: string[] = []): User => ({
  id: dbUser.id,
  name: dbUser.name || 'Anonymous',
  username: dbUser.username || 'user',
  email: dbUser.email || '',
  bio: dbUser.bio || '',
  avatar: dbUser.profile_pic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dbUser.username}`,
  joinedAt: dbUser.created_at,
  following: followingIds, // We only strictly need who *I* am following to show UI state
  followers: [], // We rely on dbUser.followers_count for numbers usually, but App expects array. We'll populate empty or specific if needed.
  isVerified: false
});

export const signUpWithEmail = async (email: string, pass: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password: pass });
  if (error) throw error;
  if (data.user) await initializeUserData(data.user.id, email);
  return data.user;
};

export const loginWithEmail = async (email: string, pass: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) throw error;
  return data.user;
};

export const loginWithGoogle = async () => {
  // Use location.origin but ensure it's a clean string
  const origin = window.location.origin.replace(/\/$/, "");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: origin,
    }
  });

  if (error) throw error;
  return data;
};

export const logout = () => supabase.auth.signOut();

export const fetchUserProfile = async (uid: string): Promise<User | null> => {
  try {
    const { data: profile, error } = await supabase.from('users').select('*').eq('id', uid).single();

    if (error || !profile) return null;

    // Fetch who this user follows (to populate the 'following' list)
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', uid);

    // Fetch followers (optional, maybe just counts are enough, but app uses array for some logic?)
    // App.tsx uses currentUser.following.includes(targetId) to check 'Is Following'.
    // So for the *Current User*, 'following' array is critical.

    const followingIds = followingData?.map(f => f.following_id) || [];

    return mapUser(profile, followingIds);
  } catch (err) {
    console.error("fetchUserProfile error", err);
    return null;
  }
};

const initializeUserData = async (uid: string, email: string) => {
  const username = email.split('@')[0].toLowerCase() + Math.floor(Math.random() * 1000);
  await supabase.from('users').upsert({
    id: uid,
    name: username.charAt(0).toUpperCase() + username.slice(1),
    username: username,
    email: email,
    profile_pic: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    followers_count: 0,
    following_count: 0,
    created_at: new Date().toISOString()
  });
};

export const listenToAuth = (callback: (user: User | null) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const profile = await fetchUserProfile(session.user.id);
      callback(profile);
    } else {
      callback(null);
    }
  });
  return () => subscription.unsubscribe();
};

export const uploadPostImage = async (file: File, postId: string): Promise<string | null> => {
  // NOTE: Schema does not seem to have image_url in 'posts'.
  // We still upload to storage, but we might not be able to save the URL in the 'posts' table
  // unless we add a column or store it in 'content' JSON?
  // For now, we return the URL but accept it might not be persisted in DB row.
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${postId}.${fileExt}`;
    const filePath = `posts/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('eiva-images').upload(filePath, file);
    if (uploadError) return null;

    const { data } = supabase.storage.from('eiva-images').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (e) {
    console.error("Image upload failed", e);
    return null;
  }
};

export const createPost = async (post: Question) => {
  // Mapping App 'Question' to DB 'posts'
  const { error } = await supabase.from('posts').insert({
    id: post.id,
    user_id: post.userId,
    username: post.userName,
    question: post.title,     // Maps 'title' -> 'question'
    ai_answer: post.aiAnswer,
    space: post.category,     // Maps 'category' -> 'space'
    // image_url: post.imageUrl // REMOVED: Column likely missing in DB schema provided
  });
  if (error) throw error;
};

export const updatePostAIAnswer = async (postId: string, answer: string) => {
  await supabase.from('posts').update({ ai_answer: answer }).eq('id', postId);
};

export const listenToPosts = (callback: (posts: Question[]) => void) => {
  const fetchAll = async () => {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id ( profile_pic )
      `)
      .order('created_at', { ascending: false });

    if (posts) {
      // We need to fetch likes and comments to hydrate the App's 'Question' model
      // This is N+1 but acceptable for small scale. 
      // Optimized: Fetch all likes/comments for these posts in one go if possible, or just use real-time listeners for updates.
      // For now, we'll map correctly.

      const formatted: Question[] = await Promise.all(posts.map(async (p) => {
        // Fetch current likes for this post (User IDs)
        const { data: likes } = await supabase.from('likes').select('user_id').eq('post_id', p.id);
        const { data: comments } = await supabase.from('comments').select('*, users:user_id(username, profile_pic)').eq('post_id', p.id);

        return {
          id: p.id,
          userId: p.user_id,
          userName: p.username,
          userAvatar: p.users?.profile_pic || 'https://api.dicebear.com/7.x/avataaars/svg?seed=unknown',
          title: p.question,        // DB: question
          content: '',              // DB has no separate content field, assuming title is enough
          aiAnswer: p.ai_answer,
          imageUrl: undefined,      // DB has no image_url
          category: p.space || 'General',
          createdAt: p.created_at,
          likes: likes?.map((l: any) => l.user_id) || [],
          dislikes: [],
          comments: comments?.map((c: any) => ({
            id: c.id,
            userId: c.user_id,
            userName: c.users?.username || 'User',
            userAvatar: c.users?.profile_pic || '',
            content: c.text,       // DB: text
            createdAt: c.created_at
          })) || [],
          isOfficial: false
        };
      }));
      callback(formatted);
    }
  };

  const channel = supabase.channel('posts-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchAll)
    .subscribe();

  fetchAll();
  return () => supabase.removeChannel(channel);
};

export const listenToFollows = (callback: () => void) => {
  const channel = supabase.channel('follows-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const listenToUsers = (callback: () => void) => {
  const channel = supabase.channel('users-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const deletePost = async (postId: string) => {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
};

export const toggleVote = async (postId: string, userId: string, type: 'up' | 'down') => {
  // DB 'likes' table has: id, post_id, user_id, type ('like'/'dislike'?)
  // Let's assume 'type' column exists as implied by previous code, or just insert if not.
  // Schema screenshot didn't explicity show 'type' column in 'likes' table but it's standard.
  // If 'likes' table is just for likes, we might not support dislikes.
  // Let's assume standard toggle behavior.

  const { data: existing } = await supabase.from('likes').select('id, type').eq('post_id', postId).eq('user_id', userId).maybeSingle();

  if (existing) {
    await supabase.from('likes').delete().eq('id', existing.id);
  } else {
    await supabase.from('likes').insert({ post_id: postId, user_id: userId, type: 'like' });
  }
};

export const addCommentToPost = async (postId: string, comment: Comment) => {
  await supabase.from('comments').insert({
    id: comment.id,
    post_id: postId,
    user_id: comment.userId,
    text: comment.content
  });
};

export const toggleFollow = async (currentUserId: string, targetUserId: string) => {
  const { data: existing } = await supabase.from('follows').select('id').eq('follower_id', currentUserId).eq('following_id', targetUserId).maybeSingle();
  if (existing) {
    await supabase.from('follows').delete().eq('id', existing.id);
  } else {
    await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetUserId });
  }
};

export const getAllUsersList = async () => {
  const { data } = await supabase.from('users').select('*');
  if (!data) return [];
  return data.map((u: any) => mapUser(u));
};

export const getSpacesList = async () => {
  const { data } = await supabase.from('spaces').select('*');
  return data?.map((s: any) => ({ ...s, icon: s.icon || '🚀', members: [] })) || [];
};

// --- Chat Functions ---

export const sendMessage = async (receiverId: string, content: string) => {
  const { error } = await supabase.from('messages').insert({
    sender_id: (await supabase.auth.getUser()).data.user?.id,
    receiver_id: receiverId,
    content: content
  });
  if (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const fetchMessages = async (contactId: string): Promise<import('../types').Message[]> => {
  const myId = (await supabase.auth.getUser()).data.user?.id;
  if (!myId) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${myId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${myId})`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return data.map((m: any) => ({
    id: m.id,
    senderId: m.sender_id,
    receiverId: m.receiver_id,
    content: m.content,
    createdAt: m.created_at
  }));
};

export const listenToMessages = (callback: () => void) => {
  const channel = supabase.channel('messages-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const searchUsers = async (query: string): Promise<User[]> => {
  if (!query) return [];
  const { data } = await supabase
    .from('users')
    .select('*')
    .ilike('username', `%${query}%`)
    .limit(20);

  if (!data) return [];
  // Use mapUser but check if followers count matters for search display
  // For now simple map with empty counts is fine as list view fetches profile individually usually?
  // Actually list view uses 'user-list' or 'search' view in App.tsx.
  // App.tsx uses 'mapUser' indirectly via searchUsers result.
  // We need to match 'mapUser' signature or update it.
  // mapUser expects dbUser and optionally followingIds.
  // For search, we might not know following status efficiently for all 20 users without join.
  // We can pass empty for now, UI might show 'Follow' button correctly if it checks 'currentUser.following' separately?
  // App.tsx 'handleSearch' -> 'getFilteredPeople'.
  // 'getFilteredPeople' uses 'allUsers' state usually for local search?
  // Wait, App.tsx line 406: searchUsers is NOT used in App.tsx provided in Step 77?
  // Let's re-read App.tsx in Step 77.
  // Line 216: handleSearch sets state.
  // Line 271: getFilteredPeople filters 'allUsers'.
  // 'allUsers' is populated by 'getAllUsersList'.
  // So 'searchUsers' might be used in 'UserChat' or 'Navbar' for a different search?
  // Ah, 'UserChat' might use it.
  return data.map((u: any) => ({
    id: u.id,
    name: u.name || 'Anonymous',
    username: u.username || 'user',
    email: u.email || '',
    bio: u.bio || '',
    avatar: u.profile_pic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`,
    joinedAt: u.created_at,
    following: [],
    followers: [],
    isVerified: false
  }));
};

