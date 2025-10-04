import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: [
    "/",
    "/pricing",
    "/faq",
    "/domain",
    "/web", 
    "/sites",
    "/email",
    "/ads",
    "/ads-analyzer",
    "/campaign-drafts",
    "/api/serve-site",
    "/api/subdomain-handler",
    "/api/clerk-webhooks(.*)",
    "/api/google-ads/analyze-csv",
    "/api/google-ads/optimize-campaigns",
    "/api/google-ads/export-recommendations",
    "/api/migrations/run-campaign-analysis",
    "/sign-in(.*)",
    "/sign-up(.*)"
  ]
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
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}; 