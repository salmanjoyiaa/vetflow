import { createBrowserClient } from '@supabase/ssr';
import { isDemoMode } from '@/lib/demo/credentials';
import { mockSupabaseClient } from '@/lib/demo/mock-supabase';

export function createClient() {
  if (isDemoMode()) {
    return mockSupabaseClient as any;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
