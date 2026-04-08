import { NextResponse } from "next/server";

import { sanitizeAuthCallbackNextPath } from "@/lib/auth-callback-next-path";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;
  const code = searchParams.get("code");
  const nextPath = sanitizeAuthCallbackNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const redirectUrl = new URL(nextPath, origin);
  if (redirectUrl.origin !== requestUrl.origin) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  return NextResponse.redirect(redirectUrl);
}
