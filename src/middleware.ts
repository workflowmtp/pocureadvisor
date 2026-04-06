import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple middleware without heavy dependencies
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check for session token cookie
  const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
                       request.cookies.get('__Secure-next-auth.session-token')?.value;
  
  // If no session and trying to access protected route, redirect to login
  if (!sessionToken && !pathname.startsWith('/login') && !pathname.startsWith('/register') && !pathname.startsWith('/api/auth')) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!login|register|api/auth|_next/static|_next/image|favicon.ico|fonts|api).*)',
  ],
};
