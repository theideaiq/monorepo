import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/account';

  // Security Check: Prevent Open Redirects
  // Ensure the 'next' parameter is a relative path starting with a single '/'
  // and not a double slash '//' which could be an external protocol-relative URL
  const isSafeRedirect = next.startsWith('/') && !next.startsWith('//');
  const safeNext = isSafeRedirect ? next : '/account';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // If something went wrong, send them to an error page or back home
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
