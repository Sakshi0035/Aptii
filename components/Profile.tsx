import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AppContexts';
import { supabase } from '../services/supabase';
import { MailIcon, UsersIcon, EditIcon, TrashIcon, FlameIcon } from './Icons';
import { Profile as ProfileType, CommunityPost } from '../types';
import Avatar from './Avatar';
import { PostCard } from './Community';
import DatabaseSetupInstructions from './DatabaseSetupInstructions';

const Profile: React.FC = () => {
    const { userId } = useParams<{ userId?: string }>();
    const { user: currentUser, profile: currentUserProfile, setProfile: setCurrentUserProfile, signOut } = useAuth();

    const [viewedProfile, setViewedProfile] = useState<ProfileType | null>(null);
    const [recentPosts, setRecentPosts] = useState<CommunityPost[]>([]);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [postsError, setPostsError] = useState<string | null>(null);
    
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isOwnProfile = !userId || (currentUser?.id === userId);

    useEffect(() => {
        const fetchProfileData = async () => {
            setLoadingProfile(true);
            setFetchError(null);
            setPostsError(null);
            const profileId = userId || currentUser?.id;

            if (!profileId) {
                setLoadingProfile(false);
                return;
            }

            // Fetch profile details
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', profileId)
                .single();
            
            if (profileError) {
                console.error("Error fetching profile", profileError.message);
                setFetchError(profileError.message);
                setLoadingProfile(false);
                return;
            } else {
                setViewedProfile(profileData);
                setNewUsername(profileData?.username || '');
            }

            // Fetch recent posts
            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select(`*, profiles(*)`)
                .eq('user_id', profileId)
                .order('created_at', { ascending: false })
                .limit(5);

            if (postsError) {
                console.error("Error fetching user posts", postsError.message);
                setPostsError(postsError.message);
            } else if (postsData) {
                setRecentPosts(postsData as CommunityPost[]);
            }

            setLoadingProfile(false);
        };

        fetchProfileData();

    }, [userId, currentUser]);

    const handleUsernameUpdate = async () => {
        if (!currentUser || !newUsername.trim() || newUsername.trim() === currentUserProfile?.username) {
            setIsEditingUsername(false);
            return;
        }

        const { data, error } = await supabase
            .from('profiles')
            .update({ username: newUsername.trim() })
            .eq('id', currentUser.id)
            .select()
            .single();

        if (error) {
            alert('Error updating username.');
            console.error(error);
        } else if (data) {
            setCurrentUserProfile(data);
            setViewedProfile(data); // Also update the viewed profile state
            setIsEditingUsername(false);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !currentUser) {
            return;
        }
        
        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const filePath = `${currentUser.id}/${Math.random()}.${fileExt}`;

        setUploading(true);
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

        if (uploadError) {
            alert('Error uploading avatar.');
            console.error(uploadError);
            setUploading(false);
            return;
        }
        
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

        const { data, error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', currentUser.id)
            .select()
            .single();

        if (updateError) {
            alert('Error updating profile with new avatar.');
            console.error(updateError);
        } else if (data) {
            setCurrentUserProfile(data);
            setViewedProfile(data);
        }
        setUploading(false);
    };

    const handleDeleteAccount = async () => {
        if (window.confirm("Are you absolutely sure you want to delete your account? This action is irreversible and will delete all your data.")) {
            alert("Account deletion initiated. For this to work fully, a Supabase Edge Function is required to delete user data before deleting the auth user. Signing out as a placeholder.");
            signOut();
        }
    };

    if (loadingProfile) {
        return <div className="text-center p-10">Loading profile...</div>;
    }
    
    if (fetchError) {
        return (
            <div className="p-6">
                 <DatabaseSetupInstructions feature="leaderboard" error={fetchError} />
            </div>
        );
    }
    
    if (!viewedProfile) {
        return <div className="text-center p-10">Profile not found.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                {/* Profile Header */}
                <div className="h-32 bg-gradient-to-r from-fire-orange-start to-fire-red-end"></div>
                <div className="px-6 pb-6 -mt-16">
                    <div className="flex items-end">
                        <div className="relative">
                           <Avatar avatarUrl={viewedProfile?.avatar_url} name={viewedProfile?.username || 'User'} size={112} className="border-4 border-white dark:border-gray-800" />
                            {isOwnProfile && (
                                <>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-1 right-1 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white hover:bg-gray-900 transition-colors"
                                        disabled={uploading}
                                        aria-label="Upload profile picture"
                                   >
                                        {uploading ? <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"></div> : <EditIcon size={16} />}
                                   </button>
                                   <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleAvatarUpload}
                                        accept="image/*"
                                        className="hidden"
                                        disabled={uploading}
                                    />
                                </>
                            )}
                        </div>
                        <div className="ml-4 mb-2">
                           {isOwnProfile && isEditingUsername ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        className="text-2xl font-bold bg-transparent border-b-2 border-fire-orange-start focus:outline-none"
                                        autoFocus
                                        onBlur={handleUsernameUpdate}
                                        onKeyDown={e => e.key === 'Enter' && handleUsernameUpdate()}
                                    />
                                    <button onClick={handleUsernameUpdate} className="px-3 py-1 text-sm bg-green-500 text-white rounded-md">Save</button>
                                </div>
                           ) : (
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold">{viewedProfile?.username || 'AptiPro User'}</h1>
                                    {isOwnProfile && <button onClick={() => setIsEditingUsername(true)} className="text-gray-400 hover:text-fire-orange-start"><EditIcon size={16} /></button>}
                                </div>
                           )}
                            <div className="flex items-center text-lg font-semibold text-gray-700 dark:text-gray-200">
                                <FlameIcon className="text-orange-500 mr-2" />
                                <span>{(viewedProfile?.score || 0).toLocaleString()} XP</span>
                            </div>
                        </div>
                    </div>
                     {isOwnProfile && (
                        <div className="mt-4 text-gray-600 dark:text-gray-300">
                            <p className="flex items-center">
                                <MailIcon className="mr-2"/>
                                {currentUser?.email}
                            </p>
                        </div>
                     )}
                </div>
            </div>

            {/* Recent Posts */}
            <div className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                <h2 className="text-xl font-bold flex items-center mb-4"><UsersIcon className="mr-2"/> Recent Posts</h2>
                {postsError ? (
                     <DatabaseSetupInstructions feature="community" error={postsError}/>
                ) : recentPosts.length > 0 ? (
                    <div className="space-y-4">
                        {recentPosts.map(post => (
                           <PostCard key={post.id} post={post} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">This user hasn't posted anything yet.</p>
                )}
            </div>

             {/* Danger Zone */}
             {isOwnProfile && (
                <div className="mt-6 p-6 bg-red-50 dark:bg-gray-800/20 border border-red-200 dark:border-red-500/30 rounded-2xl shadow-lg">
                    <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Danger Zone</h2>
                    <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">These actions are permanent and cannot be undone.</p>
                    <div className="mt-4">
                        <button 
                            onClick={handleDeleteAccount}
                            className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
                        >
                           <span className="flex items-center"><TrashIcon size={16} className="mr-2"/> Delete My Account</span>
                        </button>
                    </div>
                </div>
             )}
        </div>
    );
};

export default Profile;
