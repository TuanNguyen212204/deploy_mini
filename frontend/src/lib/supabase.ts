import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'http://127.0.0.1:54321'
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || 'test-anon-key'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  // Không crash app khi thiếu env (đặc biệt lúc dev/E2E).
  // E2E sẽ mock request auth; còn dev có thể cấu hình env sau.
  console.warn(
    '[supabase] Missing env (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY). Using fallback defaults.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)


export interface UserProfile {
    id: string
    email: string
    name: string
    plan: string
    phone: string | null
    created_at: string
}
