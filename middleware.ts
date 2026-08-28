import { NextResponse, type NextRequest } from "next/server";

/**
 * Demo-mode middleware: no Supabase auth.
 * "/" is the role selector; all app routes are open.
 * Redirects stale /login traffic to "/" (also the role selector).
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|demo|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
