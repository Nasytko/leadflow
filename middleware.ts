import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const protectedPaths = [
  "/dashboard",
  "/admin",
  "/facebook",
  "/forms",
  "/telegram",
  "/leads",
  "/logs",
  "/wiki",
  "/settings",
];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameWithoutLocale = pathname.replace(/^\/(ru|en)/, "") || "/";

  const isProtected = protectedPaths.some(
    (path) =>
      pathnameWithoutLocale === path ||
      pathnameWithoutLocale.startsWith(`${path}/`)
  );

  if (isProtected) {
    const sessionToken =
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value;

    if (!sessionToken) {
      const locale = pathname.match(/^\/(ru|en)/)?.[1] ?? "ru";
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const authPaths = ["/login", "/register", "/forgot-password", "/reset-password"];
  const isAuthPath = authPaths.some((path) => pathnameWithoutLocale === path);

  if (isAuthPath) {
    const sessionToken =
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value;

    if (sessionToken) {
      const locale = pathname.match(/^\/(ru|en)/)?.[1] ?? "ru";
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
