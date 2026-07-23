import { mainNavItems } from "@/lib/navigation/app-navigation"

/** Single source of truth — add routes here when they are ready to ship. */
export const READY_PROTECTED_ROUTES = ["/dashboard", "/billing"] as const

export type ReadyProtectedRoute = (typeof READY_PROTECTED_ROUTES)[number]

export function isProtectedRouteReady(pathname: string): boolean {
  return (READY_PROTECTED_ROUTES as readonly string[]).includes(pathname)
}

export function getProtectedPageTitle(pathname: string): string {
  const navItem = mainNavItems.find((item) => item.href === pathname)
  if (navItem) return navItem.title

  const segment = pathname.split("/").filter(Boolean).at(-1)
  if (!segment) return "This page"

  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function pathnameFromSlug(slug: string[]): string {
  return `/${slug.join("/")}`
}
