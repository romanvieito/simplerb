import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  // Skip middleware for API routes on main domain
  if (request.nextUrl.pathname.startsWith('/api/') && 
      (hostname === 'simplerb.com' || hostname === 'www.simplerb.com')) {
    return NextResponse.next();
  }
  
  // Check if it's a subdomain request
  if (hostname && hostname.includes('.simplerb.com')) {
    const subdomain = hostname.split('.')[0];
    
    // Handle subdomain requests directly in middleware
    if (subdomain !== 'www' && subdomain !== 'simplerb') {
      // Rewrite to subdomain handler
      const url = request.nextUrl.clone();
      url.pathname = '/api/subdomain-handler';
      return NextResponse.rewrite(url);
    }
  }
  
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
      "/api/subdomain-handler",
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