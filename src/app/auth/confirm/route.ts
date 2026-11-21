import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: EmailOtpType[] = ["email", "signup", "recovery", "email_change", "invite"];

/**
 * Verifies `token_hash` links, which is the flow that works even when the email
 * is opened in a different browser than the one that started the request
 * (important for local testing with the Supabase inbox at http://localhost:54324).
 *
 * Point your Supabase email templates at:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");

  const defaultNext = type === "recovery" ? "/reset-password" : "/dashboard";
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : defaultNext;

  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("That link is invalid or has expired.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("That link is invalid or has expired. Request a new one.")}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
