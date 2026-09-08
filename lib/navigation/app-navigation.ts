import type { LucideIcon } from "lucide-react"
import {
  Activity,
  BookOpen,
  Cloud,
  CreditCard,
  FileCode2,
  Layers,
  LayoutDashboard,
  Monitor,
  Settings,
  Users,
  Wrench,
} from "lucide-react"

import { AUTH_ROLES, type AuthRole } from "@/lib/auth/roles"

export type AppNavItem = {
  title: string
  href: string
  icon: LucideIcon
  /** If set, item is only shown for this role. Omit = all signed-in users. */
  roles?: readonly AuthRole[]
}

export const mainNavItems: AppNavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Billing", href: "/billing", icon: CreditCard },
  { title: "Content Policies", href: "/content-policies", icon: Layers },
  { title: "Devices", href: "/devices", icon: Monitor },
  { title: "Activity Logs", href: "/activity-logs", icon: Activity },
  { title: "Tools", href: "/tools", icon: Wrench },
  { title: "Config Generator", href: "/config-generator", icon: FileCode2 },
  { title: "Settings", href: "/settings", icon: Settings },
  { title: "Guides", href: "/guides", icon: BookOpen },
]

/** Extra sidebar pages allowed only for ADMIN. */
export const adminNavItems: AppNavItem[] = [
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
    roles: [AUTH_ROLES.ADMIN],
  },
  {
    title: "Cloudflare",
    href: "/admin/cloudflare",
    icon: Cloud,
    roles: [AUTH_ROLES.ADMIN],
  },
]

export function getNavItemsForRole(role: AuthRole): {
  main: AppNavItem[]
  admin: AppNavItem[]
} {
  const main = mainNavItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  )
  const admin =
    role === AUTH_ROLES.ADMIN
      ? adminNavItems.filter(
          (item) => !item.roles || item.roles.includes(role)
        )
      : []

  return { main, admin }
}
