"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PaymentMethodInfo } from "@/schemas/billing/details"

export interface PaymentMethodCardProps {
  paymentMethod: PaymentMethodInfo
  className?: string
}

function formatCardBrand(brand: string): string {
  return brand.charAt(0).toUpperCase() + brand.slice(1)
}

function formatCardExpiry(expMonth: number, expYear: number): string {
  const month = String(expMonth).padStart(2, "0")
  const year = String(expYear).slice(-2)
  return `${month}/${year}`
}

function formatFunding(funding: string | null): string {
  if (!funding) return "—"
  return funding.charAt(0).toUpperCase() + funding.slice(1)
}

function formatCountry(country: string | null): string {
  if (!country) return "—"

  try {
    return new Intl.DisplayNames(undefined, { type: "region" }).of(
      country.toUpperCase()
    ) ?? country.toUpperCase()
  } catch {
    return country.toUpperCase()
  }
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[11px] font-medium tracking-wide text-brand-text-muted uppercase">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-brand-text-heading">
        {value}
      </p>
    </div>
  )
}

export function PaymentMethodCard({
  paymentMethod,
  className,
}: PaymentMethodCardProps) {
  const brandLabel = formatCardBrand(paymentMethod.brand)
  const expiry = formatCardExpiry(
    paymentMethod.expMonth,
    paymentMethod.expYear
  )

  return (
    <div className={cn("space-y-5", className)}>
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-primary via-[#0a3d9e] to-[#062d75] p-6 text-white shadow-lg shadow-brand-primary/20">
        <div className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 -left-6 size-28 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute top-1/2 right-1/4 size-16 rounded-full bg-white/5" />

        <div className="relative space-y-7">
          <div className="flex items-start justify-between gap-4">
            <div
              className="size-10 rounded-md bg-gradient-to-br from-amber-200/90 to-amber-400/90 shadow-inner"
              aria-hidden
            />
            <div className="text-end">
              <p className="text-lg font-bold tracking-widest uppercase">
                {brandLabel}
              </p>
              <p className="text-[11px] text-white/70 uppercase">
                {formatFunding(paymentMethod.funding)} card
              </p>
            </div>
          </div>

          <p className="font-mono text-xl tracking-[0.18em] sm:text-2xl">
            •••• •••• •••• {paymentMethod.last4}
          </p>

          <div className="flex items-end justify-between gap-6">
            <div className="min-w-0">
              <p className="text-[10px] tracking-widest text-white/60 uppercase">
                Cardholder
              </p>
              <p className="truncate text-sm font-semibold">
                {paymentMethod.cardholderName ?? "Name not provided"}
              </p>
            </div>
            <div className="shrink-0 text-end">
              <p className="text-[10px] tracking-widest text-white/60 uppercase">
                Expires
              </p>
              <p className="text-sm font-semibold">{expiry}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge className="rounded-lg border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
          Default payment method
        </Badge>
        <Badge
          variant="secondary"
          className="rounded-lg border-0 bg-brand-primary/10 text-brand-primary"
        >
          Secured by Stripe
        </Badge>
      </div>

      <div className="grid gap-4 rounded-lg border border-border/60 bg-brand-background/60 p-4 sm:grid-cols-2">
        <DetailItem label="Card brand" value={brandLabel} />
        <DetailItem label="Last 4 digits" value={paymentMethod.last4} />
        <DetailItem label="Expiry" value={expiry} />
        <DetailItem
          label="Card type"
          value={formatFunding(paymentMethod.funding)}
        />
        <DetailItem
          label="Issuing country"
          value={formatCountry(paymentMethod.country)}
        />
        <DetailItem
          label="Billing email"
          value={paymentMethod.billingEmail ?? "—"}
        />
        <DetailItem
          label="Cardholder name"
          value={paymentMethod.cardholderName ?? "—"}
          className="sm:col-span-2"
        />
        <DetailItem
          label="Billing address"
          value={paymentMethod.billingAddress ?? "—"}
          className="sm:col-span-2"
        />
      </div>
    </div>
  )
}
