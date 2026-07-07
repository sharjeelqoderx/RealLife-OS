"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"

import { AppNavbar } from "@/components/layout/app-navbar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

const SIDEBAR_COOKIE_NAME = "sidebar_state"

function readSidebarCookie(): boolean {
  if (typeof document === "undefined") {
    return true
  }

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`))

  if (!match) {
    return true
  }

  return match.split("=")[1] === "true"
}

interface DashboardShellProps {
  children: ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    setOpen(readSidebarCookie())
  }, [])

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider open={open} onOpenChange={setOpen}>
        <AppSidebar />
        <SidebarInset className="min-h-svh bg-brand-background">
          <AppNavbar />
          <div className="flex flex-1 flex-col p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
