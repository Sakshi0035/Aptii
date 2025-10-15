import React, { useState, FormEvent } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AppContexts';

const PasswordReset: React.FC = () => {
    const { setIsPasswordRecovery } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleReset = async (e: FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password should be at least 6 characters.");
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setMessage("Your password has been updated successfully! Redirecting...");
            setTimeout(() => {
                setIsPasswordRecovery(false);
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 animate-fade-in p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
                <div className="text-center">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fire-orange-start to-fire-red-end">AptiPro</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Create a new password
                    </p>
                </div>

                {error && <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-300">{error}</div>}
                {message && <div className="p-3 text-sm text-center text-green-800 bg-green-100 rounded-lg dark:bg-green-900 dark:text-green-300">{message}</div>}

                <form className="space-y-6" onSubmit={handleReset}>
                    <div className="relative">
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="block w-full px-4 py-3 text-gray-900 bg-transparent border-2 border-gray-300 rounded-lg appearance-none dark:text-white dark:border-gray-600 focus:outline-none focus:ring-0 focus:border-fire-orange-start peer"
                            placeholder=" "
                        />
                        <label htmlFor="password" className="absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-gray-800 px-2 peer-focus:px-2 peer-focus:text-fire-orange-start peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-2">
                            New Password
                        </label>
                    </div>
                    <div className="relative">
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="block w-full px-4 py-3 text-gray-900 bg-transparent border-2 border-gray-300 rounded-lg appearance-none dark:text-white dark:border-gray-600 focus:outline-none focus:ring-0 focus:border-fire-orange-start peer"
                            placeholder=" "
                        />
                        <label htmlFor="confirmPassword" className="absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-gray-800 px-2 peer-focus:px-2 peer-focus:text-fire-orange-start peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-2">
                            Confirm New Password
                        </label>
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !!message}
                        className="w-full px-4 py-3 font-semibold text-white bg-gradient-to-r from-fire-orange-start to-fire-red-end rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fire-red-end transition-opacity disabled:opacity-50"
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PasswordReset;
