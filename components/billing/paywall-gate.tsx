"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, LogOut } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

import { CustomSpinner } from "@/components/feedback/custom-spinner"
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
import {
  BILLING_PLANS,
  type BillingPlan,
  type BillingPlanId,
} from "@/lib/stripe/plans"
import type { LogoutResponse } from "@/schemas/auth/logout"
import type {
  BillingStatusResponse,
  CreateCheckoutSessionResponse,
} from "@/schemas/billing/checkout"

export interface PaywallGateProps {
  initialBillingStatus: BillingStatusResponse
}

function PricingCheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-700">
      <Check className="mt-0.5 size-4 shrink-0 text-cyan-500" aria-hidden />
      <span>{children}</span>
    </li>
  )
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
    refetchInterval: (q) => (q.state.data?.hasAccess ? false : 4000),
  })

  const logout = useMutation({
    mutationFn: () =>
      apiClient<LogoutResponse>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      router.push("/login")
    },
  })

  const trial = useMutation({
    mutationFn: (_planId: "personal") =>
      apiClient<CreateCheckoutSessionResponse>("/api/stripe/start-trial", {
        method: "POST",
      }),
    onSuccess: (data) => {
      window.location.assign(data.url)
    },
  })

  const checkout = useMutation({
    mutationFn: (planId: Extract<BillingPlanId, "willpower_pro" | "family_pack">) =>
      apiClient<CreateCheckoutSessionResponse>("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ planId }),
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

  const planPending = trial.isPending || checkout.isPending
  const error =
    trial.error instanceof Error
      ? trial.error.message
      : checkout.error instanceof Error
        ? checkout.error.message
        : null

  function onSelectPlan(plan: BillingPlan) {
    if (plan.kind === "trial") {
      trial.mutate("personal")
      return
    }

    checkout.mutate(plan.id as "willpower_pro" | "family_pack")
  }

  function isPlanLoading(planId: BillingPlanId) {
    if (trial.isPending && trial.variables === planId) return true
    if (checkout.isPending && checkout.variables === planId) return true
    return false
  }

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-h-[90vh] w-full max-w-[calc(100%-1.5rem)] gap-0 overflow-y-auto border-0 bg-slate-50 p-0 shadow-[0_8px_40px_var(--brand-shadow)] sm:max-w-5xl"
      >
        <div className="flex justify-end px-4 pt-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Log out"
            disabled={logout.isPending || planPending}
            onClick={() => logout.mutate()}
            className="text-slate-500 hover:bg-slate-200/70 hover:text-slate-900"
          >
            {logout.isPending ? <CustomSpinner /> : <LogOut aria-hidden />}
          </Button>
        </div>

        <DialogHeader className="space-y-2 px-6 pt-2 pb-2 text-center sm:px-10">
          <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Choose your level of protection.
          </DialogTitle>
          <DialogDescription className="text-base text-slate-500">
            Add a card to start your 7-day free trial.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 py-6 sm:px-8 sm:pb-8">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
            {BILLING_PLANS.map((plan) => {
              const isLoading = isPlanLoading(plan.id)

              return (
                <div
                  key={plan.id}
                  className={`relative flex h-full flex-col rounded-2xl border bg-white p-6 sm:p-8 ${
                    plan.highlighted
                      ? "border-2 border-cyan-400 shadow-lg shadow-cyan-400/25"
                      : "border-slate-200 shadow-sm"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-md bg-cyan-500 px-3 py-1 text-[10px] font-bold tracking-wider text-white uppercase">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
                    {plan.tier}
                  </p>

                  <div className="mt-3">
                    {plan.price === "free" ? (
                      <span className="text-4xl font-bold text-brand-primary">
                        Free
                      </span>
                    ) : (
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-4xl font-bold text-brand-primary">
                          ${plan.price}
                        </span>
                        <span className="text-base text-slate-500">/mo</span>
                      </div>
                    )}
                  </div>

                  <ul className="mt-8 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <PricingCheckItem key={feature}>{feature}</PricingCheckItem>
                    ))}
                  </ul>

                  <Button
                    type="button"
                    disabled={planPending || logout.isPending}
                    onClick={() => onSelectPlan(plan)}
                    className={`mt-8 h-11 w-full ${
                      plan.highlighted
                        ? "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90"
                        : "border border-brand-primary bg-white text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {isLoading ? <CustomSpinner /> : null}
                    {plan.cta}
                  </Button>
                </div>
              )
            })}
          </div>

          {error && (
            <p role="alert" className="mt-4 text-center text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
