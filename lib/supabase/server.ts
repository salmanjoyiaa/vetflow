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

// Server client utilizing the service-role key for privileged/admin actions bypass RLS.
// This client MUST NEVER be imported by or exposed to client-side components.
export async function createAdminClient() {
  if (isDemoMode()) {
    return mockSupabaseClient as any;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
            // Ignore
          }
        },
      },
    }
  );
}
