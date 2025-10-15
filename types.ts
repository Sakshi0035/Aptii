import { User as SupabaseUser } from '@supabase/supabase-js';

export type User = SupabaseUser;

export interface Profile {
    id: string;
    username: string | null;
    avatar_url: string | null;
    score: number;
}

export interface TestResult {
    id: string;
    created_at: string;
    topic: string;
    score: number;
    total_questions: number;
    user_id: string;
}

export interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface VoiceQuestion {
  question: string;
  answer: string;
}

export interface CommunityPost {
    id: string;
    created_at: string;
    content: string;
    user_id: string;
    profiles: Profile | null
}