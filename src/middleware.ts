import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-access-token');
  const path = request.nextUrl.pathname;

  // Public routes
  if (path.startsWith('/auth') || path === '/') {
    if (token && path === '/') {
      return NextResponse.redirect(new URL('/redirect', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
