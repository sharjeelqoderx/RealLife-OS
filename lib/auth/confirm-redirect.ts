import { defaultAuthenticatedPath } from "@/lib/auth/routes"

const CONFIRM_PATH = "/api/auth/confirm"

const CONFIRM_SEARCH_PARAMS = ["code", "token_hash", "type", "next"] as const

function resolveDefaultNext(type: string | null): string {
  if (type === "recovery" || type === "email_change") {
    return "/change-password"
  }

  if (
    type === "signup" ||
    type === "invite" ||
    type === "magiclink" ||
    type === "email"
  ) {
    return defaultAuthenticatedPath
  }

  return defaultAuthenticatedPath
}

export function buildAuthConfirmRedirectUrl(requestUrl: URL): URL | null {
  if (requestUrl.pathname === CONFIRM_PATH) {
    return null
  }

  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type")

  if (!code && !(tokenHash && type)) {
    return null
  }

  const confirmUrl = new URL(CONFIRM_PATH, requestUrl.origin)

  for (const key of CONFIRM_SEARCH_PARAMS) {
    const value = requestUrl.searchParams.get(key)
    if (value) {
      confirmUrl.searchParams.set(key, value)
    }
  }

  if (!confirmUrl.searchParams.has("next")) {
    confirmUrl.searchParams.set(
      "next",
      resolveDefaultNext(confirmUrl.searchParams.get("type"))
    )
  }

  return confirmUrl
}
