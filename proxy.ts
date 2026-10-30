import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the Supabase session cookie on every dashboard request and sends
 * signed-out visitors to the right login page. Role checks happen on the
 * server next to the data (lib/auth.ts), not here.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  const isAdminLogin = pathname === "/admin/login";
  const isTutorLogin = pathname === "/tutor/login";

  if (!signedIn && pathname.startsWith("/admin") && !isAdminLogin) {
    return redirectWithCookies(request, response, "/admin/login", pathname);
  }
  if (!signedIn && pathname.startsWith("/tutor") && !isTutorLogin) {
    return redirectWithCookies(request, response, "/tutor/login", pathname);
  }
  return response;
}

function redirectWithCookies(request: NextRequest, from: NextResponse, to: string, next: string) {
  const target = request.nextUrl.clone();
  target.pathname = to;
  target.search = next && next !== to ? `?next=${encodeURIComponent(next)}` : "";
  const redirect = NextResponse.redirect(target);
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

export const config = {
  matcher: ["/admin/:path*", "/tutor/:path*"],
};
