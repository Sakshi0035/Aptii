import React from 'react';
import { WarningIcon } from './Icons';

type Feature = 'weekly_progress' | 'leaderboard' | 'community';

interface Props {
    feature: Feature;
    error: string;
}

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded-md text-xs text-left overflow-x-auto">
        <code>{children}</code>
    </pre>
);

const instructions: Record<Feature, { title: string, steps: string[] }> = {
    weekly_progress: {
        title: "Practice & Progress Features",
        steps: [
`-- 1. Create the 'test_results' table to store scores.
CREATE TABLE test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,
`-- 2. Add a 'score' column to your 'profiles' table.
-- This table is usually created by a Supabase Auth trigger.
ALTER TABLE profiles ADD COLUMN score INT NOT NULL DEFAULT 0;`,
`-- 3. Create a function to securely update scores.
CREATE OR REPLACE FUNCTION increment_user_score(increment_value INT)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET score = score + increment_value
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql;`,
`-- 4. Enable Row Level Security (RLS) for 'test_results'
-- and create policies for users to manage their own results.
CREATE POLICY "Users can manage their own test results."
ON public.test_results
FOR ALL
USING (auth.uid() = user_id);`
        ]
    },
    leaderboard: {
        title: "Leaderboard Feature",
        steps: [
`-- 1. Ensure your 'profiles' table has a 'score' column.
-- This table is usually created by a Supabase Auth trigger.
ALTER TABLE profiles ADD COLUMN score INT NOT NULL DEFAULT 0;`,
`-- 2. Make sure RLS policies on the 'profiles' table
-- allow users to read public data.
-- Example policy for public read access:
CREATE POLICY "Profiles are viewable by everyone."
ON public.profiles
FOR SELECT
USING (true);`
        ]
    },
    community: {
        title: "Community & Posts Feature",
        steps: [
`-- 1. Create the 'posts' table for community messages.
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,
`-- 2. Enable Row Level Security (RLS) for the 'posts' table
-- and create policies for users to see and create posts.
CREATE POLICY "Users can view all posts."
ON public.posts
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own posts."
ON public.posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);`
        ]
    }
};

const DatabaseSetupInstructions: React.FC<Props> = ({ feature, error }) => {
    const info = instructions[feature];

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            <WarningIcon size={48} className="mb-4" />
            <h3 className="font-bold text-lg">Database Configuration Needed</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                The "{info.title}" requires database tables that are not yet set up. Please run the following SQL commands in your Supabase SQL Editor to enable this feature.
            </p>
            <details className="mt-4 w-full max-w-lg text-left">
                <summary className="cursor-pointer font-semibold text-sm text-center">Show Setup Instructions</summary>
                <div className="mt-2 space-y-4">
                    {info.steps.map((step, index) => <CodeBlock key={index}>{step.trim()}</CodeBlock>)}
                </div>
            </details>
             <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">Original error: {error}</p>
        </div>
    );
};

export default DatabaseSetupInstructions;
