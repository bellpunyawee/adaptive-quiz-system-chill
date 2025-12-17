// src/middleware.ts
// Next.js middleware for course authorization
// Note: This middleware is currently disabled because it cannot use bcrypt in Edge Runtime
// Authentication and authorization are handled in server components using requireCourseAccess()

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Middleware is currently a pass-through
  // All authentication and authorization happens in server components
  // using requireCourseAccess() which has full Prisma access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
