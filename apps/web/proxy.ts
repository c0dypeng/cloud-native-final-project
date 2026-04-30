import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "token";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

// JWT signature is verified inside Server Components via lib/auth/session.ts.
// Proxy only checks cookie presence so it can stay on the edge runtime
// without exposing JWT_SECRET there.
export const config = {
  matcher: ["/dashboard/:path*"],
};
