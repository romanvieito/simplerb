import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: [
    "/", 
    "/api/serve-site", 
    "/api/clerk-webhooks(.*)",
    "/api/getUser",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/pricing",
    "/faq"
  ],
});

export const config = {
  matcher: [
    "/domain",
    "/web",
    "/ads",
    "/email",
    "/api/((?!serve-site|clerk-webhooks|getUser).*)"
  ]
}; 