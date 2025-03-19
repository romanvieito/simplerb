import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: [
    "/", 
    "/api/serve-site", 
    "/api/clerk-webhooks(.*)",
    "/api/getUser"
  ],
});

export const config = {
  matcher: [
    "/domain", 
    "/web", 
    "/ads", 
    "/pricing", 
    "/faq",
    "/api/((?!serve-site|clerk-webhooks|getUser).*)"
  ],
}; 