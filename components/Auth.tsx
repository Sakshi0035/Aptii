import React, { useState, FormEvent, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AppContexts';
import { Navigate } from 'react-router-dom';
import { GoogleIcon } from './Icons';
import AuthSetupInstructions from './AuthSetupInstructions';

const AuthPage: React.FC = () => {
  const { session } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [authSetupError, setAuthSetupError] = useState<'oauth' | 'email' | null>(null);

  useEffect(() => {
    // Check for OAuth errors in the URL hash after redirect
    const hash = window.location.hash;
    if (hash.includes('error_description')) {
        const params = new URLSearchParams(hash.substring(1));
        const errorDescription = decodeURIComponent(params.get('error_description') || '');
        setError(`Google Auth Error: ${errorDescription}`);
        setAuthSetupError('oauth');
        // Clean the URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }
  
  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setAuthSetupError(null);

    try {
      let result;
      if (isLogin) {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        result = await supabase.auth.signUp({ email, password });
      }
      
      if (result.error) throw result.error;

      if (!isLogin) {
        setMessage('Check your email for the confirmation link!');
      }

    } catch (error: any) {
      setError(error.message);
      if (error.message.toLowerCase().includes('sign-ups are disabled')) {
        setAuthSetupError('email');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setAuthSetupError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if(error) {
        setError(error.message);
        if (error.message.toLowerCase().includes('provider not enabled')) {
            setAuthSetupError('oauth');
        }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 animate-fade-in p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
        <div className="text-center">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fire-orange-start to-fire-red-end">AptiPro</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
            {isLogin ? 'Sign in to continue your journey' : 'Create an account to get started'}
            </p>
        </div>
        
        {authSetupError && <AuthSetupInstructions type={authSetupError} />}

        {error && <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-300">{error}</div>}
        {message && <div className="p-3 text-sm text-center text-green-800 bg-green-100 rounded-lg dark:bg-green-900 dark:text-green-300">{message}</div>}

        <div className="space-y-4">
             <button 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center px-4 py-3 font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
            >
                <GoogleIcon />
                <span className="ml-3">Sign in with Google</span>
            </button>
             <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative px-2 text-sm bg-white dark:bg-gray-800 text-gray-500">Or with email</div>
            </div>
        </div>

        <form className="space-y-6" onSubmit={handleAuth}>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full px-4 py-3 text-gray-900 bg-transparent border-2 border-gray-300 rounded-lg appearance-none dark:text-white dark:border-gray-600 focus:outline-none focus:ring-0 focus:border-fire-orange-start peer"
              placeholder=" "
            />
            <label htmlFor="email" className="absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-gray-800 px-2 peer-focus:px-2 peer-focus:text-fire-orange-start peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-2">
              Email address
            </label>
          </div>

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
              Password
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 font-semibold text-white bg-gradient-to-r from-fire-orange-start to-fire-red-end rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fire-red-end transition-opacity disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button onClick={() => setIsLogin(!isLogin)} className="ml-1 font-medium text-fire-orange-start hover:underline">
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;