// FILE: src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

export async function middleware(req: NextRequest) {
  // Defense-in-depth only: real authorization/role checks happen server-side
  // in layouts/API routes via getCurrentUser()/requireAdmin(), which re-query
  // the database. This middleware just avoids rendering protected shells for
  // obviously unauthenticated visitors.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}