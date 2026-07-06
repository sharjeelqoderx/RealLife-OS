"use client"

import { useMutation } from "@tanstack/react-query"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import type { LogoutResponse } from "@/schemas/auth/logout"

export function LogoutButton() {
  const router = useRouter()

  const logoutMutation = useMutation({
    mutationFn: () =>
      apiClient<LogoutResponse>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      router.push("/login")
    },
  })

  return (
    <Button
      type="button"
      variant="outline"
      disabled={logoutMutation.isPending}
      onClick={() => logoutMutation.mutate()}
      className="gap-2"
    >
      <LogOut aria-hidden className="size-4" />
      Logout
    </Button>
  )
}
