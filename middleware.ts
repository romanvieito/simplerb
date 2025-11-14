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
    "/find-keywords",
    "/api/serve-site",
    "/api/subdomain-handler",
    "/api/clerk-webhooks(.*)",
    "/api/google-ads/test",
    "/api/google-ads/sample-data",
    "/api/google-ads/keyword-planning",
    "/api/google-ads/keyword-planning-rest",
    "/api/keyword-status",
    "/api/openai",
    "/api/test",
    "/api/migrations/run-campaign-analysis",
    "/api/migrations/run-normalized-migration",
    "/api/migrations/run-conversion-migration",
    "/api/migrations/create-smart-pilot-tables",
    "/api/migrations/create-keyword-favorites-table",
    "/api/migrations/create-oauth-tokens-table",
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
    "/((?!_next/static|_next/image|favicon.ico|public).*)"
  ],
}; 