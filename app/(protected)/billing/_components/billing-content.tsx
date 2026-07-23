"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CreditCard, RefreshCw } from "lucide-react"
import { useEffect } from "react"

import {
  AttachCardPanel,
  BillingActionButton,
} from "@/app/(protected)/billing/_components/attach-card-panel"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/query/keys"
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

const billingCardClassName = "bg-brand-surface ring-0 shadow-none"

function formatDate(iso: string | null): string {
  if (!iso) return "—"

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
  }).format(new Date(iso))
}

function formatCardBrand(brand: string): string {
  return brand.charAt(0).toUpperCase() + brand.slice(1)
}

function formatCardExpiry(expMonth: number, expYear: number): string {
  const month = String(expMonth).padStart(2, "0")
  const year = String(expYear).slice(-2)
  return `${month}/${year}`
}

function DetailField({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium tracking-wide text-brand-text-muted uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-brand-text-heading">{value}</p>
    </div>
  )
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

  const expiryLabel =
    data.status === "trialing" ? "Trial ends" : "Renews on"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text-heading">Billing</h1>
        <p className="text-sm text-brand-text-muted">
          Manage your subscription and payment method.
        </p>
      </div>

      {needsCard && (
        <div
          role="status"
          className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Your account does not have a payment method yet. Add a card below to
          keep access after your trial ends.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={billingCardClassName}>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Your current plan and billing period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-wide text-brand-text-muted uppercase">
                  Plan
                </p>
                <p className="mt-1 text-lg font-semibold text-brand-text-heading">
                  {data.planName}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  statusStyle
                )}
              >
                {statusLabel}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium tracking-wide text-brand-text-muted uppercase">
                {expiryLabel}
              </p>
              <p className="mt-1 text-sm text-brand-text-heading">
                {formatDate(data.currentPeriodEnd)}
              </p>
            </div>

            {data.cancelAtPeriodEnd && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Your subscription will cancel at the end of the current billing
                period.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={billingCardClassName}>
          <CardHeader>
            <CardTitle>Payment method</CardTitle>
            <CardDescription>
              Card on file for subscription renewals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasCard && data.paymentMethod ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <DetailField
                    label="Cardholder name"
                    value={data.paymentMethod.cardholderName ?? "—"}
                    className="min-w-0 flex-1"
                  />

                  {data.canManagePayment && (
                    <BillingActionButton
                      label="Update card"
                      icon={<RefreshCw aria-hidden />}
                      isPending={paymentActionPending}
                      onClick={() => portal.mutate()}
                      variant="outline"
                      className="shrink-0"
                    />
                  )}
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                    <CreditCard className="size-5" aria-hidden />
                  </div>
                  <div className="min-w-0 space-y-3">
                    <DetailField
                      label="Card number"
                      value={`${formatCardBrand(data.paymentMethod.brand)} •••• ${data.paymentMethod.last4}`}
                    />
                    <DetailField
                      label="Expires"
                      value={formatCardExpiry(
                        data.paymentMethod.expMonth,
                        data.paymentMethod.expYear
                      )}
                    />
                  </div>
                </div>

                {portalError && (
                  <p role="alert" className="text-sm text-destructive">
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
