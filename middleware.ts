import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  // Refresh session if expired - required for Server Components
  const { data: { session } } = await supabase.auth.getSession();

  // Admin routes that require admin authentication
  const adminPaths = ['/admin'];
  const isAdminPath = adminPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  // Check admin access for admin routes
  if (isAdminPath) {
    if (!session) {
      const redirectUrl = new URL('/auth?message=Admin access requires authentication', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Check if user is admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
    const userEmail = session.user?.email;
    
    if (!userEmail || !adminEmails.includes(userEmail)) {
      // Create access denied response
      const accessDeniedUrl = new URL('/access-denied', request.url);
      return NextResponse.redirect(accessDeniedUrl);
    }
  }

  // Protected routes that require authentication
  const protectedPaths = ['/dashboard', '/level', '/exercise'];
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  // Redirect to auth if trying to access protected route without session
  if (isProtectedPath && !session) {
    const redirectUrl = new URL('/auth', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to dashboard if logged in user tries to access auth page
  if (request.nextUrl.pathname === '/auth' && session) {
    const redirectUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};