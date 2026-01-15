import { type NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';
import type { UserRole } from '@/types/auth';

export async function proxy(request: NextRequest) {
  const { supabase, response } = await createMiddlewareClient(request);
  const path = request.nextUrl.pathname;

  // Rate Limiting (Simple IP-based for critical paths)
  if (path === '/login' || path.startsWith('/auth/callback')) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    // Inline simplified rate limit check since we can't easily use the shared util in middleware
    // Note: In a real production edge environment, direct DB calls might be slow or unsupported
    // without a data proxy. Here we rely on Supabase JS client.
    try {
      const now = new Date();
      const { data: limit } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('key', ip)
        .single();

      if (limit) {
        const lastRequest = new Date(limit.last_request);
        const timeDiff = now.getTime() - lastRequest.getTime();
        if (timeDiff < 60000 && limit.count >= 10) {
          // 10 requests per minute for login page loads
          return new NextResponse('Too Many Requests', { status: 429 });
        }

        // Async update (fire and forget - sort of, we await it to be safe in middleware)
        // In middleware we generally want to be fast.
        // For now, we update.
        if (timeDiff > 60000) {
          await supabase
            .from('rate_limits')
            .update({ count: 1, last_request: now.toISOString() })
            .eq('key', ip);
        } else {
          await supabase
            .from('rate_limits')
            .update({ count: limit.count + 1, last_request: now.toISOString() })
            .eq('key', ip);
        }
      } else {
        await supabase
          .from('rate_limits')
          .insert({ key: ip, count: 1, last_request: now.toISOString() });
      }
    } catch (e) {
      // Fail open on rate limit error
      console.error('Rate limit error', e);
    }
  }

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect if not logged in
  if (!user && path !== '/login' && !path.startsWith('/auth/callback')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user) {
    // Check role and banned status
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, banned')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      // If we can't fetch profile, safer to deny
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check Banned
    if (profile.banned) {
      // If banned, sign them out or just redirect to login with error
      // Ideally sign out, but we can't easily do that in middleware without handling cookies manually.
      // We'll redirect to login with error, client page should handle signout if needed.
      if (path !== '/login') {
        return NextResponse.redirect(
          new URL('/login?error=Account+Suspended', request.url),
        );
      }
    }

    const role = profile.role as UserRole;
    if (role !== 'admin' && role !== 'superadmin') {
      if (path !== '/login') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } else {
      // Admin/Superadmin - Check MFA
      // Skip check if we are already on MFA page or Login
      if (
        path !== '/auth/mfa' &&
        path !== '/login' &&
        !path.startsWith('/auth/callback')
      ) {
        const { data: mfa } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (mfa && mfa.currentLevel !== 'aal2') {
          return NextResponse.redirect(new URL('/auth/mfa', request.url));
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
