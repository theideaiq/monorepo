import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';
import { UserRole } from '@/types/auth';

export async function proxy(request: NextRequest) {
  const { supabase, response } = await createMiddlewareClient(request);

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check role
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    // If we can't fetch profile, safer to deny
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const role = profile.role as UserRole;
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)'],
};
