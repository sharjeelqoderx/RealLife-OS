"use client"

import { QueryClient, QueryClientProvider, useIsMutating } from "@tanstack/react-query"
import { useState } from "react"

import { GlobalSpinner } from "@/components/feedback/global-spinner"

function MutationSpinner() {
  const pendingMutations = useIsMutating()

  if (pendingMutations === 0) {
    return null
  }

  return <GlobalSpinner />
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <MutationSpinner />
    </QueryClientProvider>
  )
}
