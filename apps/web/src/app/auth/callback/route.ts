import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  let next = searchParams.get('next') ?? '/account';

  // Validate 'next' to prevent Open Redirect vulnerabilities
  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/account';
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If something went wrong, send them to an error page or back home
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
