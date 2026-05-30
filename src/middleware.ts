import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { accountFromEmail, accountHomePath, normalizeAccount } from "@/lib/account-role";

const protectedPrefixes = [
  "/dashboard",
  "/members",
  "/products",
  "/schedule",
  "/attendance",
  "/coach",
  "/staff",
  "/student",
  "/availability",
  "/booking-requests",
  "/course-applications",
  "/imports"
];

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function roleAllowedPath(account: string, pathname: string) {
  if (account === "admin") return true;

  if (account.startsWith("jl")) {
    return ["/coach", "/availability", "/schedule", "/members"].some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
  }

  if (account.startsWith("xy")) {
    return ["/student", "/products"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }

  return false;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request
  });

  if (!hasSupabaseConfig()) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const account = normalizeAccount(user.user_metadata?.account) || accountFromEmail(user.email);
    const target = accountHomePath(account);
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (user && isProtectedPath(pathname)) {
    const account = normalizeAccount(user.user_metadata?.account) || accountFromEmail(user.email);
    if (!roleAllowedPath(account, pathname)) {
      return NextResponse.redirect(new URL(accountHomePath(account), request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
