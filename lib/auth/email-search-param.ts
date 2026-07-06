export function buildAuthHref(path: string, email?: string): string {
  const trimmed = email?.trim()
  if (!trimmed) {
    return path
  }

  const params = new URLSearchParams({ email: trimmed })
  return `${path}?${params.toString()}`
}

export function getEmailFromSearchParam(
  email: string | string[] | undefined
): string {
  if (typeof email === "string") {
    return email.trim()
  }

  if (Array.isArray(email)) {
    return email[0]?.trim() ?? ""
  }

  return ""
}
