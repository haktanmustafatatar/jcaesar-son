import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const isProtectedRoute = createRouteMatcher([
  "/:locale/dashboard(.*)",
  "/dashboard(.*)",
  "/:locale/admin(.*)",
  "/admin(.*)",
  "/api/chatbots(.*)",
  "/api/conversations(.*)",
  "/api/settings(.*)",
  "/api/crawl(.*)",
  "/api/admin(.*)",
]);

const isAdminRoute = createRouteMatcher([
  "/:locale/admin(.*)",
  "/admin(.*)",
  "/api/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  if (isAdminRoute(req)) {
    const { userId } = await auth();
    console.log(`[MIDDLEWARE-DEBUG] Request for admin route: ${req.nextUrl.pathname}, userId: ${userId}`);
    const allowedAdminIds = [
      "user_3DxRHvrWjkRHA9gBZuFm2aXLR9k", // haktanmustafas@gmail.com (SUPERADMIN)
      "user_3BipiRjNTlgQwubLijlvWqTDmzX", // dadasubeyt@gmail.com (ADMIN)
    ];

    if (userId && allowedAdminIds.includes(userId)) {
      console.log(`[MIDDLEWARE-DEBUG] User ${userId} is a verified admin. Bypassing protect.`);
      // System administrator bypass
    } else {
      console.log(`[MIDDLEWARE-DEBUG] User ${userId} is NOT in allowedAdminIds list. Enforcing Clerk Org protect.`);
      await auth.protect((has) => {
        return has({ role: "org:admin" }) || has({ role: "org:superadmin" });
      });
    }
  }

  // Bypass next-intl for API routes to prevent JSON parsing errors (returning HTML)
  if (req.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: [
    "/((?!_next|_vercel|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
