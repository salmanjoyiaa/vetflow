import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isDemoMode } from '@/lib/demo/credentials';
import { mockSupabaseClient } from '@/lib/demo/mock-supabase';

export async function createClient() {
  if (isDemoMode()) {
    return mockSupabaseClient as any;
  }

  const cookieStore = await cookies();


  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Can be ignored if called from Server Components during rendering.
          }
        },
      },
    }
  );
}

// Service-role client for privileged server actions (audit logs, stock adjustments).
// Must not use SSR cookie handling — user JWT would otherwise apply RLS instead of bypassing it.
export async function createAdminClient() {
  if (isDemoMode()) {
    return mockSupabaseClient as any;
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
