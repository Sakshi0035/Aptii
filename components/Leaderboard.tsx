import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AppContexts';
import { Profile } from '../types';
import { TrophyIcon, FlameIcon } from './Icons';
import Avatar from './Avatar';
import DatabaseSetupInstructions from './DatabaseSetupInstructions';

interface LeaderboardUser extends Profile {
    rank: number;
}

const Leaderboard: React.FC = () => {
    const { user, profile } = useAuth();
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [userRank, setUserRank] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeaderboardData = async () => {
            setFetchError(null);
            
            // Fetch top 10 users
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, score')
                .order('score', { ascending: false })
                .limit(10);
            
            if (error) {
                console.error("Error fetching leaderboard:", error.message);
                setFetchError(error.message);
                return;
            }

            if (data) {
                const rankedData = data.map((p, index) => ({ ...p, rank: index + 1 }));
                setLeaderboard(rankedData as LeaderboardUser[]);
            }

            // Fetch current user's rank
            if (profile) {
                const { count, error: rankError } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .gt('score', profile.score);

                if (rankError) {
                    console.error("Error fetching user rank:", rankError.message);
                } else {
                    setUserRank((count ?? 0) + 1);
                }
            }
        };

        const performInitialFetch = async () => {
            setLoading(true);
            await fetchLeaderboardData();
            setLoading(false);
        }

        performInitialFetch();

        // Set up real-time subscription
        const channel = supabase
            .channel('public:profiles:leaderboard')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                (payload) => {
                    // Refetch data without showing the main loading spinner
                    fetchLeaderboardData();
                }
            )
            .subscribe();

        // Cleanup subscription on component unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile]);
    
    const isUserInTop10 = leaderboard.some(p => p.id === user?.id);

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold">Overall Rankings</h2>
                    <p className="text-gray-500 dark:text-gray-400">See where you stand among the best.</p>
                </div>
                {loading ? (
                    <div className="p-6 text-center">Loading leaderboard...</div>
                ) : fetchError ? (
                    <div className="p-6">
                        <DatabaseSetupInstructions feature="leaderboard" error={fetchError} />
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">The leaderboard is empty. Be the first to set a score!</div>
                ) : (
                    <>
                        <ul>
                            {leaderboard.map((player, index) => (
                                <li key={player.id}>
                                     <Link to={`/profile/${player.id}`} className={`flex items-center p-4 transition-colors cursor-pointer ${player.id === user?.id ? 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-gray-700/50 dark:to-gray-700/50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'} ${index !== leaderboard.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}>
                                        <div className="flex items-center w-1/6">
                                            <span className="font-bold text-lg text-gray-600 dark:text-gray-300 w-8 text-center">{player.rank}</span>
                                            {player.rank <= 3 && <TrophyIcon className={player.rank === 1 ? 'text-yellow-400' : player.rank === 2 ? 'text-gray-400' : 'text-yellow-600'} />}
                                        </div>
                                        <div className="flex items-center w-3/6">
                                            <Avatar avatarUrl={player.avatar_url} name={player.username} size={40} className="mr-4" />
                                            <span className={`font-medium truncate ${player.id === user?.id ? 'text-fire-orange-start font-bold' : ''}`}>{player.username || 'Anonymous'}</span>
                                        </div>
                                        <div className="flex items-center justify-end w-2/6 text-right">
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">{player.score.toLocaleString()} XP</span>
                                            <FlameIcon className="ml-2 text-orange-500" />
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        {!isUserInTop10 && profile && userRank && (
                             <div className="border-t-4 border-dashed border-gray-200 dark:border-gray-700">
                                <div className="flex items-center p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-gray-700/50 dark:to-gray-700/50">
                                    <div className="flex items-center w-1/6">
                                        <span className="font-bold text-lg text-gray-600 dark:text-gray-300 w-8 text-center">{userRank}</span>
                                    </div>
                                    <div className="flex items-center w-3/6">
                                        <Avatar avatarUrl={profile.avatar_url} name={profile.username} size={40} className="mr-4" />
                                        <span className="font-medium truncate text-fire-orange-start font-bold">{profile.username || 'Anonymous'} (You)</span>
                                    </div>
                                    <div className="flex items-center justify-end w-2/6 text-right">
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">{profile.score.toLocaleString()} XP</span>
                                        <FlameIcon className="ml-2 text-orange-500" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;