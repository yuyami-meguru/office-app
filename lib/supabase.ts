import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase環境変数が設定されていません');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '設定済み' : '未設定');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// データベーステーブルの型定義
export type Database = {
  users: {
    id: string;
    username: string;
    password: string;
    name: string;
    role: 'admin' | 'staff';
    email?: string;
    require_password_change: boolean;
    created_at: string;
  };
  members: {
    id: number;
    name: string;
    role: string;
    departments: string[];
    group?: string;
    created_at: string;
  };
  tasks: {
    id: number;
    title: string;
    description: string;
    status: '未着手' | '進行中' | '完了';
    priority: '低' | '中' | '高';
    due_date: string;
    created_at: string;
  };
  events: {
    id: number;
    title: string;
    date: string;
    time: string;
    location: string;
    attendees: string;
    notes: string;
    created_at: string;
  };
  departments: {
    id: number;
    name: string;
    created_at: string;
  };
};

