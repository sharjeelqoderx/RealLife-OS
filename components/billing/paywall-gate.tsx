"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ApiError, apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/query/keys"
import { BILLING_PLANS } from "@/lib/stripe/plans"
import type {
  BillingStatusResponse,
  CreateCheckoutSessionResponse,
} from "@/schemas/billing/checkout"

export interface PaywallGateProps {
  initialBillingStatus: BillingStatusResponse
}

export function PaywallGate({ initialBillingStatus }: PaywallGateProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const billingQuery = useQuery({
    queryKey: queryKeys.billing.status(),
    queryFn: () =>
      apiClient<BillingStatusResponse>("/api/stripe/billing-status"),
    initialData: initialBillingStatus,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.data?.hasAccess ? false : 3000,
  })

  const checkoutMutation = useMutation({
    mutationFn: () =>
      apiClient<CreateCheckoutSessionResponse>("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ planId: "basic_monthly" }),
      }),
    onSuccess: (data) => {
      window.location.assign(data.url)
    },
  })

  useEffect(() => {
    const checkout = searchParams.get("checkout")
    if (checkout !== "success" && checkout !== "canceled") {
      return
    }

    void queryClient.invalidateQueries({
      queryKey: queryKeys.billing.status(),
    })

    const next = new URLSearchParams(searchParams.toString())
    next.delete("checkout")
    const query = next.toString()
    router.replace(query ? `/dashboard?${query}` : "/dashboard")
  }, [queryClient, router, searchParams])

  const hasAccess = billingQuery.data.hasAccess
  const errorMessage =
    checkoutMutation.error instanceof ApiError
      ? checkoutMutation.error.message
      : checkoutMutation.error instanceof Error
        ? checkoutMutation.error.message
        : null

  if (hasAccess) {
    return null
  }

  const plan = BILLING_PLANS[0]

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        className="max-w-md gap-0 overflow-hidden border-0 bg-brand-surface p-0 shadow-[0_8px_40px_var(--brand-shadow)] sm:max-w-md"
      >
        <DialogHeader className="space-y-2 border-b border-brand-input-border px-6 pt-6 pb-4 text-left">
          <DialogTitle className="text-xl font-bold text-brand-text-heading">
            Choose a plan to continue
          </DialogTitle>
          <DialogDescription className="text-sm text-brand-text-muted">
            Your account is ready. Subscribe to unlock the dashboard and start
            protecting your focus.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          <div className="relative rounded-2xl border-2 border-cyan-400 bg-white p-6 shadow-lg shadow-cyan-400/20">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="rounded-md bg-cyan-500 px-3 py-1 text-[10px] font-bold tracking-wider text-white uppercase">
                Required
              </span>
            </div>

            <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
              {plan.name}
            </p>
            <div className="mt-3 flex items-baseline gap-0.5">
              <span className="text-4xl font-bold text-brand-primary">$9</span>
              <span className="text-base text-slate-500">/mo</span>
            </div>
            <p className="mt-2 text-sm text-brand-text-muted">
              {plan.description}
            </p>

            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-slate-700"
                >
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-cyan-500"
                    aria-hidden
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {errorMessage && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {errorMessage}
              </p>
            )}

            <Button
              type="button"
              className="mt-6 h-11 w-full bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90"
              disabled={checkoutMutation.isPending}
              onClick={() => checkoutMutation.mutate()}
            >
              Subscribe now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
