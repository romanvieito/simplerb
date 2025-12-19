import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
  "/api/contact-leads",
  "/api/keyword-favorites",
  "/api/keyword-favorites-refresh"
];

const isPublicRoute = createRouteMatcher(DEV_BYPASS_AUTH ? ["/(.*)"] : basePublicRoutes);
const isIgnoredRoute = createRouteMatcher([
  "/api/subdomain-handler",
  "/api/serve-site"
]);
const isContactLeadRoute = createRouteMatcher([
  "/api/contact-leads",
  "/api/contact-leads/(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  if (isIgnoredRoute(req)) {
    return NextResponse.next();
  }

  if (DEV_BYPASS_AUTH) {
    return NextResponse.next();
  }

  const hostname = req.headers.get('host') || '';
  const pathname = req.nextUrl.pathname;

  // Always bypass Clerk for public lead submissions so POST forms don't redirect to Clerk
  if (isContactLeadRoute(req)) {
    return NextResponse.next();
  }

  const isSubdomain = hostname.includes('.simplerb.com') && !hostname.startsWith('www.') && hostname !== 'simplerb.com';

  if (isSubdomain && !pathname.startsWith('/api')) {
    const url = req.nextUrl.clone();
    url.pathname = '/api/subdomain-handler';
    return NextResponse.rewrite(url);
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
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