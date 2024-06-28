import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // publicRoutes: ["/", "/api/clerk-webhooks(.*)"],
  // publicRoutes: (req) => !req.url.includes("/mistral"),
});

export const config = {
  // matcher: ["/((?!.+.[w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
  // matcher: ["/((?!.+\\.[\\w]+$|_next).*)","/","/(api|trpc)(.*)"],
  matcher: ["/domain", "/web", "/ads", "/pricing", "/faq"],
};