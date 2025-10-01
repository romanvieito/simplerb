import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
  // Handle root route explicitly
  if (request.nextUrl.pathname === '/') {
    return NextResponse.next();
  }
  
  // Use Clerk auth middleware for other routes
  return authMiddleware({
    publicRoutes: [
      "/",
      "/pricing",
      "/faq",
      "/api/serve-site",
      "/api/clerk-webhooks(.*)",
      "/sign-in(.*)",
      "/sign-up(.*)"
    ],
  })(request);
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
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}; 