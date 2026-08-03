import type { LucideIcon } from "lucide-react"
import {
  Activity,
  BookOpen,
  CreditCard,
  FileCode2,
  Layers,
  LayoutDashboard,
  Monitor,
  Settings,
  Wrench,
} from "lucide-react"

export type AppNavItem = {
  title: string
  href: string
  icon: LucideIcon
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

export const sidebarUser = {
  name: "Admin User",
  email: "admin@securedns.io",
  role: "Global Access",
  shortName: "Admin",
}
