import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple middleware without heavy dependencies
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  // Allow public routes and static files
  if (isPublicRoute || pathname.startsWith('/_next') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }
  
  // Check for session token cookie
  const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
                       request.cookies.get('__Secure-next-auth.session-token')?.value;
  
  // If no session, redirect to login
  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|fonts|images).*)',
  ],
};
