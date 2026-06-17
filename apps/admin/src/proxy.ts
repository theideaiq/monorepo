import { type NextRequest, NextResponse } from 'next/server';
import { hasAdminAccess } from '@/lib/auth-utils';
import { WINDOW_SIZE_MS } from '@/lib/rate-limit';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

/**
 * Global middleware for authentication and rate limiting.
 * Runs on every request except static assets.
 */
export default async function proxy(request: NextRequest) {
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
      // Optimized selection: only need last_request and count
      const { data: limit } = await supabase
        .from('rate_limits')
        .select('last_request, count')
        .eq('key', ip)
        .single();

      if (limit) {
        const lastRequest = new Date(limit.last_request);
        const timeDiff = now.getTime() - lastRequest.getTime();
        if (timeDiff < WINDOW_SIZE_MS && limit.count >= 10) {
          // 10 requests per minute for login page loads
          return new NextResponse('Too Many Requests', { status: 429 });
        }

        // Async update (fire and forget - sort of, we await it to be safe in middleware)
        // In middleware we generally want to be fast.
        // For now, we update.
        if (timeDiff > WINDOW_SIZE_MS) {
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
    } catch (_e) {
      // Silently fail rate limiting errors to avoid blocking legitimate users if DB is slow
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
    // Optimized selection: only need role and banned status
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

    if (!hasAdminAccess(profile.role)) {
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
