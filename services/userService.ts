import { supabase } from '../supabaseClient';
import { User } from '../types';

export const getCurrentUser = async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }

    // Fetch followers/following counts or data if needed
    // For now, initializing empty arrays or fetching from a separate table if 'follows' exists
    // Assuming 'follows' table exists based on schema: id, follower_id, following_id, created_at

    const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);

    const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);

    // We need to fetch actual arrays of IDs for the frontend 'following'/'followers' arrays
    // This might be heavy if there are many, but for now matching the type definition
    const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

    const { data: followersData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id);


    return {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        email: profile.email || user.email || '',
        bio: profile.bio || '',
        avatar: profile.profile_pic || '',
        joinedAt: profile.created_at,
        following: followingData?.map(f => f.following_id) || [],
        followers: followersData?.map(f => f.follower_id) || [],
        isVerified: false // Add logic if verification exists
    };
};

export const fetchUserProfile = async (userId: string): Promise<User | null> => {
    const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !profile) return null;

    const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

    const { data: followersData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId);

    return {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        email: profile.email || '',
        bio: profile.bio || '',
        avatar: profile.profile_pic || '',
        joinedAt: profile.created_at,
        following: followingData?.map(f => f.following_id) || [],
        followers: followersData?.map(f => f.follower_id) || [],
        isVerified: false
    };
};
