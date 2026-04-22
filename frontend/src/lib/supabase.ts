import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase: SupabaseClient | null =
    (supabaseUrl && supabaseKey)
        ? createClient(supabaseUrl, supabaseKey)
        : null;

if (!supabase) {
    console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY — auth features disabled.');
}


export interface UserProfile {
    id: string
    email: string
    name: string
    plan: string
    phone: string | null
    created_at: string
}
