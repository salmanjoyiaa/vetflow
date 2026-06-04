/**
 * One-off helper: grant platform super-admin to a user by email.
 * Usage: node scripts/grant-superadmin.mjs salmanjoyiaa@gmail.com
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/grant-superadmin.mjs <email>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
if (listError) {
  console.error('Failed to list users:', listError.message);
  process.exit(1);
}

const user = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No auth user found for ${email}`);
  process.exit(1);
}

const { error: profileError } = await supabase.from('user_profiles').upsert(
  {
    id: user.id,
    first_name: user.user_metadata?.first_name || email.split('@')[0],
    last_name: user.user_metadata?.last_name || '',
    is_super_admin: true,
  },
  { onConflict: 'id' }
);

if (profileError) {
  console.error('Failed to update profile:', profileError.message);
  process.exit(1);
}

console.log(`Granted super admin to ${email} (${user.id})`);
