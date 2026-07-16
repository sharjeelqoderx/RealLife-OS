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
import { apiClient } from "@/lib/api/client"
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
  const plan = BILLING_PLANS[0]

  const billingQuery = useQuery({
    queryKey: queryKeys.billing.status(),
    queryFn: () =>
      apiClient<BillingStatusResponse>("/api/stripe/billing-status"),
    initialData: initialBillingStatus,
    refetchInterval: (q) => (q.state.data?.hasAccess ? false : 4000),
  })

  const checkout = useMutation({
    mutationFn: () =>
      apiClient<CreateCheckoutSessionResponse>("/api/stripe/checkout", {
        method: "POST",
      }),
    onSuccess: (data) => {
      window.location.assign(data.url)
    },
  })

  useEffect(() => {
    const result = searchParams.get("checkout")
    if (!result) return

    void queryClient.invalidateQueries({
      queryKey: queryKeys.billing.status(),
    })
    router.replace("/dashboard")
  }, [queryClient, router, searchParams])

  if (billingQuery.data.hasAccess) return null

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-md gap-0 overflow-hidden border-0 bg-brand-surface p-0 shadow-[0_8px_40px_var(--brand-shadow)] sm:max-w-md"
      >
        <DialogHeader className="space-y-2 border-b border-brand-input-border px-6 pt-6 pb-4 text-left">
          <DialogTitle className="text-xl font-bold text-brand-text-heading">
            Choose a plan to continue
          </DialogTitle>
          <DialogDescription className="text-sm text-brand-text-muted">
            Subscribe to unlock the dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          <div className="relative rounded-2xl border-2 border-cyan-400 bg-white p-6 shadow-lg shadow-cyan-400/20">
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
                  <Check className="mt-0.5 size-4 shrink-0 text-cyan-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {checkout.error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {checkout.error instanceof Error
                  ? checkout.error.message
                  : "Checkout failed"}
              </p>
            )}
            <Button
              type="button"
              className="mt-6 h-11 w-full bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90"
              disabled={checkout.isPending}
              onClick={() => checkout.mutate()}
            >
              Subscribe now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
