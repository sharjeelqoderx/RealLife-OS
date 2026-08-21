"use client"

import type { User as AuthUser } from "@supabase/supabase-js"
import { Bell, BriefcaseBusiness, PanelLeftClose, PanelLeftOpen, User } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface AppNavbarProps {
  user: AuthUser | null
}

export function AppNavbar({ user }: AppNavbarProps) {
  const { open, toggleSidebar } = useSidebar()
  const name = user?.user_metadata?.full_name || user?.email || "User"
  const image = user?.user_metadata?.avatar_url || user?.user_metadata?.picture

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-white px-4 md:px-6">
      <div className="flex items-center gap-4 flex-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          onClick={toggleSidebar}
          className={cn(
            "-ms-1 text-brand-text-muted transition-colors",
            "hover:bg-brand-primary/5 hover:text-brand-primary"
          )}
        >
          {open ? (
            <PanelLeftClose aria-hidden className="size-5" />
          ) : (
            <PanelLeftOpen aria-hidden className="size-5" />
          )}
        </Button>

        {/* <div className="relative w-full max-w-2xl flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-text-muted"
          />
          <Input
            type="search"
            placeholder="Search devices or activity..."
            className="h-10 border-transparent bg-brand-input pl-9 py-2 text-sm shadow-none max-w-sm"
          />
        </div> */}
      </div>


      <div className="flex items-center gap-3 md:gap-4">
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-brand-text-muted transition-colors hover:bg-brand-primary/5 hover:text-brand-primary"
        >
          <Bell aria-hidden className="size-5" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <button
          type="button"
          aria-label="Management"
          className="rounded-lg p-2 text-brand-text-muted transition-colors hover:bg-brand-primary/5 hover:text-brand-primary"
        >
          <BriefcaseBusiness aria-hidden className="size-5" />
        </button>

        <Separator orientation="vertical" className="hidden h-8 md:block" />

        <div className="hidden items-center gap-3 md:flex">
          <Avatar className="size-9 rounded-full bg-brand-primary">
            {image ? <AvatarImage src={image} alt={name} /> : null}
            <AvatarFallback className="rounded-full bg-brand-primary text-brand-primary-foreground">
              <User aria-hidden className="size-4" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 text-left leading-tight">
            <p className="truncate text-sm font-semibold text-brand-text-heading">
              {name}
            </p>
            <p className="truncate text-xs text-brand-text-muted">
              {user?.email}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
