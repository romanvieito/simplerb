import { authMiddleware } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";

export default async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Check if this is a subdomain request
  const isSubdomain = hostname.includes('.simplerb.com') && !hostname.startsWith('www.') && hostname !== 'simplerb.com';

  if (isSubdomain) {
    // Rewrite to subdomain handler for subdomain requests
    const url = request.nextUrl.clone();
    url.pathname = '/api/subdomain-handler';
    return NextResponse.rewrite(url);
  }

  // Skip auth for migration routes
  if (request.nextUrl.pathname.startsWith('/api/migrations/')) {
    return NextResponse.next();
  }

  // For now, skip Clerk auth to avoid middleware issues
  // TODO: Fix Clerk middleware configuration
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)"
  ],
}; 