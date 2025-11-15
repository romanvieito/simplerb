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

  // For non-subdomain requests, use Clerk auth middleware
  return authMiddleware({
    publicRoutes: [
      "/",
      "/pricing",
      "/faq",
      "/domain",
      "/web",
      "/sites",
      "/email",
      "/ads",
      "/find-keywords",
      "/api/serve-site",
      "/api/subdomain-handler",
      "/api/clerk-webhooks(.*)",
      "/api/google-ads/test",
      "/api/google-ads/sample-data",
      "/api/google-ads/keyword-planning",
      "/api/google-ads/keyword-planning-rest",
      "/api/keyword-status",
      "/api/keyword-favorites",
      "/api/openai",
      "/api/test",
      "/api/migrations/run-campaign-analysis",
      "/api/migrations/run-normalized-migration",
      "/api/migrations/run-conversion-migration",
      "/api/migrations/create-smart-pilot-tables",
      "/api/migrations/create-keyword-favorites-table",
      "/api/migrations/create-oauth-tokens-table",
      "/api/user-domainfavorite",
      "/dashboard",
      "/sign-in(.*)",
      "/sign-up(.*)"
    ]
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
    "/((?!_next/static|_next/image|favicon.ico|public).*)"
  ],
}; 