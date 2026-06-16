import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveServerAuthContext } from '@/lib/auth/context';

const DOCUMENTS_BUCKET = 'clinic-documents';

export async function GET() {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('id', ctx.userId)
      .single();

    if (error || !profile?.avatar_url) {
      return new NextResponse('Not found', { status: 404 });
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(profile.avatar_url, 3600);

    if (signError || !signed?.signedUrl) {
      return new NextResponse('Unable to load photo', { status: 500 });
    }

    return NextResponse.redirect(signed.signedUrl);
  } catch {
    return new NextResponse('Server error', { status: 500 });
  }
}
