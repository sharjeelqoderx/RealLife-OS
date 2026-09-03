"use client"

import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useLogout } from "@/lib/query/hooks/use-logout"

export function LogoutButton() {
  const logoutMutation = useLogout()

  return (
    <Button
      type="button"
      variant="outline"
      disabled={logoutMutation.isPending}
      onClick={() => logoutMutation.mutate()}
      className="gap-2"
    >
      <LogOut aria-hidden className="size-4" />
      Sign out
    </Button>
  )
}
