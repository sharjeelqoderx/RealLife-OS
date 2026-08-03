"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, RefreshCw, Sparkles } from "lucide-react"
import { useEffect } from "react"

import { AttachCardPanel } from "@/app/(protected)/billing/_components/attach-card-panel"
import { BillingActionButton } from "@/app/(protected)/billing/_components/billing-action-button"
import { PaymentMethodCard } from "@/app/(protected)/billing/_components/payment-method-card"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/query/keys"
import { BILLING_PLANS } from "@/lib/stripe/plans"
import { cn } from "@/lib/utils"
import type {
  BillingDetailsResponse,
  BillingPortalResponse,
} from "@/schemas/billing/details"

export interface BillingContentProps {
  initialData: BillingDetailsResponse
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Past due",
  canceled: "Canceled",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
  unpaid: "Unpaid",
  paused: "Paused",
  none: "No subscription",
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  trialing: "bg-cyan-100 text-cyan-800",
  past_due: "bg-amber-100 text-amber-800",
  canceled: "bg-slate-100 text-slate-600",
  none: "bg-slate-100 text-slate-600",
}

const cardClassName = "rounded-xl bg-brand-surface ring-0 shadow-none"

function formatDate(iso: string | null): string {
  if (!iso) return "—"

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
  }).format(new Date(iso))
}

function formatPlanPrice(price: "free" | number): string {
  if (price === "free") return "Free trial"
  return `$${price}/month`
}

function getPlanFeatures(planName: string): string[] {
  const plan = BILLING_PLANS.find((entry) => entry.tier === planName)
  return plan?.features ?? ["Subscription benefits included"]
}

function getPlanPrice(planName: string): string {
  const plan = BILLING_PLANS.find((entry) => entry.tier === planName)
  return formatPlanPrice(plan?.price ?? "free")
}

export function BillingContent({ initialData }: BillingContentProps) {
  const queryClient = useQueryClient()

  const billingQuery = useQuery({
    queryKey: queryKeys.billing.details(),
    queryFn: () =>
      apiClient<BillingDetailsResponse>("/api/stripe/billing-details"),
    initialData,
  })

  const portal = useMutation({
    mutationFn: () =>
      apiClient<BillingPortalResponse>("/api/stripe/billing-portal", {
        method: "POST",
      }),
    onSuccess: (data) => {
      window.location.assign(data.url)
    },
  })

  const attachCard = useMutation({
    mutationFn: () =>
      apiClient<BillingPortalResponse>("/api/stripe/setup-payment", {
        method: "POST",
      }),
    onSuccess: (data) => {
      window.location.assign(data.url)
    },
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("portal") !== "return") return

    void queryClient.invalidateQueries({ queryKey: queryKeys.billing.details() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.billing.status() })

    params.delete("portal")
    const next = params.toString()
    const url = next ? `/billing?${next}` : "/billing"
    window.history.replaceState(null, "", url)
  }, [queryClient])

  const data = billingQuery.data
  const statusLabel = STATUS_LABELS[data.status] ?? data.status
  const statusStyle =
    STATUS_STYLES[data.status] ?? "bg-slate-100 text-slate-600"
  const portalError =
    portal.error instanceof Error ? portal.error.message : null
  const attachError =
    attachCard.error instanceof Error ? attachCard.error.message : null
  const hasCard = Boolean(data.paymentMethod)
  const needsCard = data.needsPaymentMethod
  const paymentActionPending = portal.isPending || attachCard.isPending
  const expiryLabel = data.status === "trialing" ? "Trial ends" : "Renews on"
  const planFeatures = getPlanFeatures(data.planName)
  const planPrice = getPlanPrice(data.planName)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-brand-text-heading md:text-3xl">
              Billing
            </h1>
            <Badge className="rounded-lg border-0 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/10">
              <Sparkles className="size-3" />
              Account
            </Badge>
          </div>
          <p className="max-w-2xl text-sm text-brand-text-muted">
            Manage your subscription, renewal schedule, and the card linked to
            your RealLife OS account.
          </p>
        </div>

        {data.canManagePayment && hasCard && (
          <BillingActionButton
            label="Update card"
            icon={<RefreshCw aria-hidden />}
            isPending={paymentActionPending}
            onClick={() => portal.mutate()}
            variant="outline"
            className="h-11 shrink-0 px-5"
          />
        )}
      </div>

      {needsCard && (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Your account does not have a payment method yet. Attach a card below to
          keep access after your trial ends.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <Card className={cardClassName}>
          <CardHeader className="items-center">
            <CardTitle className="text-base font-semibold">Subscription</CardTitle>
            <CardAction className="self-center row-span-1">
              <Badge
                className={cn(
                  "rounded-lg border-0 font-medium hover:opacity-100",
                  statusStyle
                )}
              >
                {statusLabel}
              </Badge>
            </CardAction>
            <CardDescription>
              Your current plan, billing cycle, and included features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-border/60 bg-brand-background/60 p-4">
              <p className="text-xs font-medium tracking-wide text-brand-text-muted uppercase">
                Current plan
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <p className="text-2xl font-bold text-brand-text-heading">
                  {data.planName}
                </p>
                <p className="text-sm font-semibold text-brand-primary">
                  {planPrice}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium tracking-wide text-brand-text-muted uppercase">
                  {expiryLabel}
                </p>
                <p className="mt-1 text-sm font-medium text-brand-text-heading">
                  {formatDate(data.currentPeriodEnd)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium tracking-wide text-brand-text-muted uppercase">
                  Access
                </p>
                <p className="mt-1 text-sm font-medium text-brand-text-heading">
                  {data.hasAccess ? "Full access enabled" : "Limited access"}
                </p>
              </div>
            </div>

            {data.cancelAtPeriodEnd && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Your subscription will cancel at the end of the current billing
                period.
              </p>
            )}

            <div>
              <p className="text-xs font-medium tracking-wide text-brand-text-muted uppercase">
                Included in your plan
              </p>
              <ul className="mt-3 space-y-2">
                {planFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-brand-text-heading"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-brand-primary/10 text-brand-primary">
                      <Check className="size-3" aria-hidden />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClassName}>
          <CardHeader className="items-center">
            <CardTitle className="text-base font-semibold">
              Payment method
            </CardTitle>
            <CardAction className="self-center row-span-1">
              <Badge
                className={cn(
                  "rounded-lg border-0 font-medium hover:opacity-100",
                  hasCard
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                )}
              >
                {hasCard ? "Card attached" : "No card"}
              </Badge>
            </CardAction>
            <CardDescription>
              {hasCard
                ? "Your linked card and billing details on file."
                : "Attach a card to enable renewals and uninterrupted access."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasCard && data.paymentMethod ? (
              <div className="space-y-4">
                <PaymentMethodCard paymentMethod={data.paymentMethod} />

                {portalError && (
                  <p
                    role="alert"
                    className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {portalError}
                  </p>
                )}
              </div>
            ) : (
              <AttachCardPanel
                onAttach={() => attachCard.mutate()}
                isPending={attachCard.isPending}
                error={attachError}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
