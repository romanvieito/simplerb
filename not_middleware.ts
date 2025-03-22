import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default authMiddleware({
  // publicRoutes: ["/", "/api/clerk-webhooks(.*)"],
  // publicRoutes: (req) => !req.url.includes("/mistral"),
});

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // matcher: ["/((?!.+.[w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
  // matcher: ["/((?!.+\\.[\\w]+$|_next).*)","/","/(api|trpc)(.*)"],
  matcher: ["/domain", "/web", "/ads", "/pricing", "/faq"]
};