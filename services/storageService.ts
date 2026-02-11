
import { supabase } from '../supabaseClient';
import { User, Question, Comment, Space } from '../types';

export const SYSTEM_EIVA_ID = '00000000-0000-0000-0000-000000000000';

const mapUser = (dbUser: any, following: string[] = [], followers: string[] = []): User => ({
  id: dbUser.id,
  name: dbUser.name || 'Anonymous',
  username: dbUser.username || 'user',
  email: dbUser.email,
  bio: dbUser.bio || '',
  avatar: dbUser.profile_pic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dbUser.username}`,
  joinedAt: dbUser.created_at,
  following,
  followers,
  isVerified: dbUser.id === SYSTEM_EIVA_ID
});

export const signUpWithEmail = async (email: string, pass: string) => {
  console.log("storageService: signUpWithEmail called");
  const { data, error } = await supabase.auth.signUp({ email, password: pass });
  if (error) {
    console.error("storageService: signUpWithEmail error", error);
    throw error;
  }
  console.log("storageService: signUpWithEmail success", data);
  if (data.user) {
    await initializeUserData(data.user.id, email);
  }
  return data.user;
};

export const loginWithEmail = async (email: string, pass: string) => {
  console.log("storageService: loginWithEmail called");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) {
    console.error("storageService: loginWithEmail error", error);
    throw error;
  }
  console.log("storageService: loginWithEmail success", data);
  return data.user;
};

export const loginWithGoogle = async () => {
  // Use location.origin but ensure it's a clean string
  const origin = window.location.origin.replace(/\/$/, "");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: origin,
      // Removed queryParams to simplify the request and avoid potential OAuth complications
    }
  });

  if (error) throw error;
  return data;
};

export const logout = () => supabase.auth.signOut();

export const fetchUserProfile = async (uid: string): Promise<User | null> => {
  console.log("storageService: fetchUserProfile start", uid);
  try {
    const { data: profile, error } = await supabase.from('users').select('*').eq('id', uid).single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log("storageService: fetchUserProfile - User not found in DB");
        return null;
      }
      console.error("storageService: fetchUserProfile error fetching user", error);
      return null;
    }

    if (!profile) {
      console.log("storageService: fetchUserProfile - Profile is null/undefined");
      return null;
    }

    // Parallelize these fetches for speed and isolation
    const [followingRes, followersRes] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', uid),
      supabase.from('follows').select('follower_id').eq('following_id', uid)
    ]);

    if (followingRes.error) console.error("storageService: Error fetching following", followingRes.error);
    if (followersRes.error) console.error("storageService: Error fetching followers", followersRes.error);

    const following = followingRes.data?.map(f => f.following_id) || [];
    const followers = followersRes.data?.map(f => f.follower_id) || [];

    console.log("storageService: fetchUserProfile success", { id: profile.id });
    return mapUser(profile, following, followers);
  } catch (err) {
    console.error("storageService: fetchUserProfile CRITICAL ERROR", err);
    return null;
  }
};

const initializeUserData = async (uid: string, email: string) => {
  console.log("storageService: initializeUserData called for", uid);
  const username = email.split('@')[0].toLowerCase() + Math.floor(Math.random() * 1000);
  try {
    const { error } = await supabase.from('users').upsert({
      id: uid,
      name: username.charAt(0).toUpperCase() + username.slice(1),
      username: username,
      email: email,
      profile_pic: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      created_at: new Date().toISOString()
    });
    if (error) {
      console.error("storageService: initializeUserData upsert error", error);
      throw error;
    }

    await initializeSystemAccount();
    await supabase.from('follows').insert({
      follower_id: uid,
      following_id: SYSTEM_EIVA_ID
    });
    console.log("storageService: initializeUserData complete");
  } catch (err) {
    console.error("storageService: initializeUserData CRITICAL ERROR", err);
  }
};

export const listenToAuth = (callback: (user: User | null) => void) => {
  console.log("storageService: Setting up auth listener");
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("storageService: Auth event:", event, "Session exists:", !!session);
    try {
      if (session?.user) {
        console.log("storageService: Fetching profile for", session.user.id);
        const profile = await fetchUserProfile(session.user.id);
        if (profile) {
          console.log("storageService: Profile found");
          callback(profile);
        } else {
          console.log("storageService: Profile not found, initializing data");
          await initializeUserData(session.user.id, session.user.email || '');
          const newProfile = await fetchUserProfile(session.user.id);
          callback(newProfile || null); // Ensure we don't pass undefined
        }
      } else {
        console.log("storageService: No session user, callback null");
        callback(null);
      }
    } catch (err) {
      console.error("storageService: listenToAuth CRITICAL ERROR in callback", err);
      callback(null);
    }
  });
  return () => subscription.unsubscribe();
};

export const initializeSystemAccount = async () => {
  await supabase.from('users').upsert({
    id: SYSTEM_EIVA_ID,
    username: 'eiva.ai',
    name: 'EIVA',
    bio: 'Official AI account of EIVA — helping you learn, ask, and grow.',
    profile_pic: 'https://api.dicebear.com/7.x/bottts/svg?seed=EIVA',
    email: 'contact@eiva.ai'
  });
};

export const uploadPostImage = async (file: File, postId: string): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${postId}.${fileExt}`;
  const filePath = `posts/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('eiva-images')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading image:', uploadError);
    return null;
  }

  const { data } = supabase.storage
    .from('eiva-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const createPost = async (post: Question) => {
  const { error } = await supabase.from('posts').insert({
    id: post.id,
    user_id: post.userId,
    username: post.userName,
    question: post.title,
    ai_answer: post.aiAnswer,
    image_url: post.imageUrl,
    space: post.category,
    created_at: new Date().toISOString()
  });
  if (error) throw error;
};

export const updatePostAIAnswer = async (postId: string, answer: string) => {
  await supabase.from('posts').update({ ai_answer: answer }).eq('id', postId);
};

export const listenToPosts = (callback: (posts: Question[]) => void) => {
  const fetchAll = async () => {
    const { data: posts } = await supabase.from('posts').select('*, likes(*), comments(*), users(profile_pic)').order('created_at', { ascending: false });
    if (posts) {
      const formatted = posts.map(p => ({
        id: p.id,
        userId: p.user_id,
        userName: p.username,
        userAvatar: p.users?.profile_pic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`,
        title: p.question,
        aiAnswer: p.ai_answer,
        imageUrl: p.image_url,
        category: p.space,
        createdAt: p.created_at,
        likes: p.likes?.filter((l: any) => l.type === 'like').map((l: any) => l.user_id) || [],
        dislikes: p.likes?.filter((l: any) => l.type === 'dislike').map((l: any) => l.user_id) || [],
        comments: p.comments?.map((c: any) => ({
          id: c.id,
          userId: c.user_id,
          userName: 'User',
          userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user_id}`,
          content: c.text,
          createdAt: c.created_at
        })) || []
      } as Question));
      callback(formatted);
    }
  };

  const channel = supabase.channel('posts-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchAll)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, fetchAll)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchAll)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchAll)
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
  const channel = supabase.channel('users-global-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const deletePost = async (postId: string) => {
  // Try to find the image URL first to clean up storage
  const { data: post } = await supabase.from('posts').select('image_url').eq('id', postId).single();

  if (post?.image_url) {
    const urlParts = post.image_url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    await supabase.storage.from('eiva-images').remove([`posts/${fileName}`]);
  }

  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) {
    console.error("Supabase Deletion Error:", error);
    throw error;
  }
};

export const toggleVote = async (postId: string, userId: string, type: 'up' | 'down') => {
  const dbType = type === 'up' ? 'like' : 'dislike';
  const { data: existing } = await supabase.from('likes').select('*').eq('post_id', postId).eq('user_id', userId).maybeSingle();

  if (existing) {
    if (existing.type === dbType) {
      await supabase.from('likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('likes').update({ type: dbType }).eq('id', existing.id);
    }
  } else {
    await supabase.from('likes').insert({ post_id: postId, user_id: userId, type: dbType });
  }
};

export const addCommentToPost = async (postId: string, comment: Comment) => {
  await supabase.from('comments').insert({
    id: comment.id,
    post_id: postId,
    user_id: comment.userId,
    text: comment.content,
    created_at: new Date().toISOString()
  });
};

export const toggleFollow = async (currentUserId: string, targetUserId: string) => {
  const { data: existing } = await supabase.from('follows').select('*').eq('follower_id', currentUserId).eq('following_id', targetUserId).maybeSingle();
  if (existing) {
    await supabase.from('follows').delete().eq('id', existing.id);
  } else {
    await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetUserId });
  }
};

export const getAllUsersList = async () => {
  const { data } = await supabase.from('users').select('*');
  if (!data) return [];
  const { data: allFollows } = await supabase.from('follows').select('*');
  return data.map(p => {
    const fng = allFollows?.filter(f => f.follower_id === p.id).map(f => f.following_id) || [];
    const fers = allFollows?.filter(f => f.following_id === p.id).map(f => f.follower_id) || [];
    return mapUser(p, fng, fers);
  });
};

export const getSpacesList = async () => {
  const { data: spaces } = await supabase.from('spaces').select('*');
  if (!spaces || spaces.length === 0) {
    return [
      { id: 'ai-space', name: 'AI', description: 'Everything about Artificial Intelligence' },
      { id: 'py-space', name: 'Python Mastery', description: 'Advanced Python programming' },
      { id: 'health-space', name: 'Health & Wellness', description: 'Living your best life' },
      { id: 'career-space', name: 'Career Guidance', description: 'Step up your professional game' }
    ].map(d => ({ ...d, icon: '🚀', members: [] }));
  }
  return spaces.map(s => ({ ...s, icon: '🚀', members: [] }));
};
