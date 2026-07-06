export type ImplicitAuthHash = {
  access_token: string
  refresh_token: string
  type: string
}

export function parseImplicitAuthHash(
  hash: string
): ImplicitAuthHash | null {
  const normalized = hash.startsWith("#") ? hash.slice(1) : hash

  if (!normalized) {
    return null
  }

  const params = new URLSearchParams(normalized)
  const access_token = params.get("access_token")
  const refresh_token = params.get("refresh_token")
  const type = params.get("type")

  if (!access_token || !refresh_token || !type) {
    return null
  }

  return { access_token, refresh_token, type }
}
