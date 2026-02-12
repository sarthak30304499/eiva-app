import { supabase } from '../supabaseClient';
import { Question, Comment } from '../types';

export const fetchPosts = async (): Promise<Question[]> => {
    const { data, error } = await supabase
        .from('posts')
        .select(`
      *,
      users:user_id (id, username, profile_pic)
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching posts:', error);
        return [];
    }

    // To get full Question object, we might need to fetch likes and comments separately or via join
    // For simplicity/performance in this iteration, I'll do sub-queries or map basic data first
    // Assuming 'likes' table exists: id, post_id, user_id

    const postsWithDetails = await Promise.all(data.map(async (post) => {
        const { data: likesData } = await supabase
            .from('likes')
            .select('user_id')
            .eq('post_id', post.id);

        const { data: commentsData } = await supabase
            .from('comments')
            .select(`
            id,
            text,
            created_at,
            user_id,
            users:user_id (username, profile_pic)
        `)
            .eq('post_id', post.id);

        const comments: Comment[] = commentsData?.map((c: any) => ({
            id: c.id,
            userId: c.user_id,
            userName: c.users?.username || 'Unknown',
            userAvatar: c.users?.profile_pic || '',
            content: c.text,
            createdAt: c.created_at
        })) || [];

        return {
            id: post.id,
            userId: post.user_id,
            userName: post.users?.username || 'Unknown',
            userAvatar: post.users?.profile_pic || '',
            title: post.question,
            content: '', // 'content' might be same as question or separate description field
            aiAnswer: post.ai_answer,
            imageUrl: undefined, // Add image_url to schema if needed or map if exists
            likes: likesData?.map((l: any) => l.user_id) || [],
            dislikes: [],
            comments: comments,
            category: post.space || 'General',
            createdAt: post.created_at,
            isOfficial: false
        } as Question;
    }));

    return postsWithDetails;
};

export const createPost = async (post: Question) => {
    const { error } = await supabase
        .from('posts')
        .insert({
            id: post.id,
            user_id: post.userId,
            username: post.userName,
            question: post.title,
            ai_answer: post.aiAnswer,
            space: post.category,
            // image_url: post.imageUrl // Uncomment if column exists
        });

    if (error) throw error;
};
