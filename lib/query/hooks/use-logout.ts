"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { apiClient } from "@/lib/api/client"
import type { LogoutResponse } from "@/schemas/auth/logout"

export function useLogout() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiClient<LogoutResponse>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear()
      router.replace("/login")
    },
  })
}
