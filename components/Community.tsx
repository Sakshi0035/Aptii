import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AppContexts';
import { CommunityPost } from '../types';
import { SendIcon, SearchIcon } from './Icons';
import Avatar from './Avatar';
import DatabaseSetupInstructions from './DatabaseSetupInstructions';

const Community: React.FC = () => {
    const { user, profile } = useAuth();
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const fetchPosts = async () => {
        setLoading(true);
        setFetchError(null);
        const { data, error } = await supabase
            .from('posts')
            .select(`
                id,
                created_at,
                content,
                user_id,
                profiles (
                    id,
                    username,
                    avatar_url
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching posts:', error.message);
            setFetchError(error.message);
        } else if (data) {
            setPosts(data as CommunityPost[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPosts();

        const channel = supabase.channel('public:posts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
                fetchPosts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePostSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPostContent.trim() || !user) return;

        const { error } = await supabase
            .from('posts')
            .insert([{ content: newPostContent, user_id: user.id }]);
        
        if (error) {
            console.error("Error creating post", error);
            setFetchError(error.message); // Show setup instructions if post fails
        } else {
            setNewPostContent('');
        }
    };
    
    const filteredPosts = useMemo(() => {
        if (!searchTerm) return posts;
        return posts.filter(post => 
            post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            post.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [posts, searchTerm]);

    return (
        <div className="max-w-3xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold mb-6">Community Hub</h1>
            
            {/* New Post Form */}
            <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg mb-6">
                <form onSubmit={handlePostSubmit} className="flex items-center space-x-4">
                     <Avatar avatarUrl={profile?.avatar_url} name={profile?.username || user?.email} size={40} />
                    <input
                        type="text"
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder="Share your thoughts or ask a question..."
                        className="flex-1 p-3 bg-gray-100 dark:bg-gray-700 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-fire-orange-start"
                    />
                    <button type="submit" className="p-3 bg-gradient-to-r from-fire-orange-start to-fire-red-end text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-50" disabled={!newPostContent.trim()}>
                        <SendIcon />
                    </button>
                </form>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search posts by content or user..."
                    className="w-full p-3 pl-10 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-fire-orange-start"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            
            {/* Posts Feed */}
            <div className="space-y-4">
                {loading ? (
                    <p className="text-center py-10 text-gray-500">Loading posts...</p>
                ) : fetchError ? (
                    <DatabaseSetupInstructions feature="community" error={fetchError} />
                ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-gray-500">{searchTerm ? "No posts match your search." : "No posts yet. Be the first to start a discussion!"}</p>
                    </div>
                ) : (
                    filteredPosts.map(post => (
                        <PostCard key={post.id} post={post} />
                    ))
                )}
            </div>
        </div>
    );
};

export const PostCard: React.FC<{ post: CommunityPost }> = ({ post }) => (
    <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
        <div className="flex items-center mb-3">
            <Avatar avatarUrl={post.profiles?.avatar_url} name={post.profiles?.username} size={40} className="mr-3" />
            <div>
                <p className="font-bold">{post.profiles?.username || post.user_id.substring(0,8)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(post.created_at).toLocaleString()}</p>
            </div>
        </div>
        <p className="text-gray-800 dark:text-gray-200 break-words">{post.content}</p>
    </div>
);


export default Community;
