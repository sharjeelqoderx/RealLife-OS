export function getResetTokenFromSearchParam(
  id: string | string[] | undefined
): string {
  if (typeof id === "string") {
    return id.trim()
  }

  if (Array.isArray(id)) {
    return id[0]?.trim() ?? ""
  }

  return ""
}
