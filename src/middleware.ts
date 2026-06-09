import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow /admin/login and /admin/onboarding through without auth
  if (
    pathname === '/admin/login' ||
    pathname.startsWith('/admin/onboarding')
  ) {
    return NextResponse.next();
  }

  // Allow API routes for login/signup/logout (they handle their own auth)
  if (
    pathname.startsWith('/api/admin/login') ||
    pathname.startsWith('/api/admin/signup') ||
    pathname.startsWith('/api/admin/logout')
  ) {
    return NextResponse.next();
  }

  // For all other /admin/* routes, verify the JWT session
  const token = request.cookies.get('admin_session')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  try {
    await jwtVerify(token, getJwtSecret());
    return NextResponse.next();
  } catch {
    // Token is invalid or expired — clear it and redirect
    const response = NextResponse.redirect(
      new URL('/admin/login', request.url)
    );
    response.cookies.delete('admin_session');
    return response;
  }
}

export const config = {
  matcher: ['/admin/:path*'],
};
