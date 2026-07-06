import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { defaultAuthenticatedPath } from "@/lib/auth/routes"
import { mapSupabaseAuthError } from "@/lib/services/auth/errors"

function loginRedirect(requestUrl: string, errorCode: string) {
  const origin = new URL(requestUrl).origin
  const params = new URLSearchParams({ error: errorCode })
  return NextResponse.redirect(new URL(`/login?${params.toString()}`, origin))
}

function resolveRedirectUrl(next: string, requestUrl: string): string {
  const origin = new URL(requestUrl).origin

  if (next.startsWith("/")) {
    return `${origin}${next}`
  }

  return origin
}

function resolveNextPath(type: string | null, nextParam: string | null): string {
  if (nextParam) {
    return nextParam
  }

  if (type === "recovery" || type === "email_change") {
    return "/change-password"
  }

  if (type === "signup" || type === "invite" || type === "magiclink") {
    return defaultAuthenticatedPath
  }

  return "/"
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type")
  const code = requestUrl.searchParams.get("code")
  const next = resolveNextPath(type, requestUrl.searchParams.get("next"))

  const supabase = await createClient()
  const isRecoveryFlow =
    type === "recovery" || next.includes("change-password")

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      mapSupabaseAuthError(error)
      return loginRedirect(
        request.url,
        isRecoveryFlow
          ? "recovery_confirmation_failed"
          : "email_confirmation_failed"
      )
    }

    return NextResponse.redirect(resolveRedirectUrl(next, request.url))
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    })

    if (error) {
      mapSupabaseAuthError(error)
      return loginRedirect(
        request.url,
        type === "recovery" || type === "email_change"
          ? "recovery_confirmation_failed"
          : "email_confirmation_failed"
      )
    }

    return NextResponse.redirect(resolveRedirectUrl(next, request.url))
  }

  return loginRedirect(request.url, "invalid_confirmation_link")
}
