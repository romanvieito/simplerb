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
    "/ads-dashboard",
    "/campaign-drafts",
    "/smart-pilot",
    "/api/serve-site",
    "/api/subdomain-handler",
    "/api/clerk-webhooks(.*)",
    "/api/google-ads/analyze-csv",
    "/api/google-ads/optimize-campaigns",
    "/api/google-ads/optimize-advanced",
    "/api/google-ads/export-recommendations",
            "/api/google-ads/test",
            "/api/google-ads/metrics",
            "/api/google-ads/create-campaign",
            "/api/google-ads/sample-data",
            "/api/google-ads/whoami",
            "/api/keyword-research",
    "/api/smart-pilot/message",
    "/api/smart-pilot/sessions",
    "/api/smart-pilot/messages",
    "/api/smart-pilot/ideas",
    "/api/migrations/run-campaign-analysis",
    "/api/migrations/run-normalized-migration",
    "/api/migrations/run-conversion-migration",
    "/api/migrations/create-smart-pilot-tables",
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