import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/auth/callback", "/pending", "/setup"]);

export async function updateSession(request) {
  let response = NextResponse.next({ request });

  // If Supabase isn't configured yet, let every request through so the
  // /setup notice can render instead of crashing in createServerClient.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!user && !PUBLIC_PATHS.has(path) && !path.startsWith("/auth/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Logged-in users hitting the login page get redirected to /chat.
  if (user && path === "/") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    if (profile?.status === "pending") url.pathname = "/pending";
    else url.pathname = "/chat";
    return NextResponse.redirect(url);
  }

  return response;
}
