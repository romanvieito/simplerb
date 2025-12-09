import { authMiddleware } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";

const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';

const basePublicRoutes = [
  "/",
  "/sign-in",
  "/sign-up",
  "/dashboard",
  "/pricing",
  "/terms",
  "/privacy",
  "/api/webhook",
  "/api/migrations/(.*)",
  "/api/stripe-webhooks",
  "/api/check-availability",
  "/api/get-tlds-godaddy",
  "/api/oauth/(.*)",
  "/api/clerk-webhooks",
  "/api/contact-leads"
];

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: DEV_BYPASS_AUTH ? ["/(.*)"] : basePublicRoutes,
  // Routes that can always be accessed, and have
  // no authentication information
  ignoredRoutes: [
    "/api/subdomain-handler",
    "/api/serve-site"
  ],
  beforeAuth: (req) => {
    if (DEV_BYPASS_AUTH) {
      // In dev bypass mode, skip Clerk middleware entirely
      return NextResponse.next();
    }

    const hostname = req.headers.get('host') || '';
    const pathname = req.nextUrl.pathname;

    // Check if this is a subdomain request
    const isSubdomain = hostname.includes('.simplerb.com') && !hostname.startsWith('www.') && hostname !== 'simplerb.com';

    // For subdomain requests, only rewrite if it's NOT an API call.
    // This keeps the generated site's API endpoints (e.g., contact form submissions)
    // working while still serving the stored HTML for normal page views.
    if (isSubdomain && !pathname.startsWith('/api')) {
      // Rewrite to subdomain handler for subdomain page requests
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