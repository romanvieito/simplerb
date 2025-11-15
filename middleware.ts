import { authMiddleware } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: [
    "/",
    "/sign-in",
    "/sign-up",
    "/pricing",
    "/terms",
    "/privacy",
    "/api/webhook",
    "/api/migrations/(.*)",
    "/api/stripe-webhooks",
    "/api/check-availability",
    "/api/get-tlds-godaddy",
    "/api/oauth/(.*)",
    "/api/clerk-webhooks"
  ],
  // Routes that can always be accessed, and have
  // no authentication information
  ignoredRoutes: [
    "/api/subdomain-handler",
    "/api/serve-site"
  ],
  beforeAuth: (req) => {
    const hostname = req.headers.get('host') || '';

    // Check if this is a subdomain request
    const isSubdomain = hostname.includes('.simplerb.com') && !hostname.startsWith('www.') && hostname !== 'simplerb.com';

    if (isSubdomain) {
      // Rewrite to subdomain handler for subdomain requests
      const url = req.nextUrl.clone();
      url.pathname = '/api/subdomain-handler';
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }
});

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