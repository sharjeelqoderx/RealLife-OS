"use client"

import { CreditCard, Lock, ShieldCheck } from "lucide-react"

import { BillingActionButton } from "@/app/(protected)/billing/_components/billing-action-button"

export interface AttachCardPanelProps {
  onAttach: () => void
  isPending: boolean
  error?: string | null
}

export function AttachCardPanel({
  onAttach,
  isPending,
  error,
}: AttachCardPanelProps) {
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-xl border border-dashed border-brand-primary/25 bg-gradient-to-br from-brand-primary/5 via-brand-background to-brand-primary/10 p-6">
        <div className="pointer-events-none absolute -top-8 -right-8 size-28 rounded-full bg-brand-primary/5" />
        <div className="pointer-events-none absolute -bottom-6 -left-4 size-20 rounded-full bg-brand-primary/5" />

        <div className="relative space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="size-10 rounded-md border border-brand-primary/20 bg-brand-primary/10" />
            <CreditCard
              className="size-6 text-brand-primary/40"
              aria-hidden
            />
          </div>

          <div className="space-y-2">
            <p className="font-mono text-lg tracking-[0.18em] text-brand-text-muted/70">
              •••• •••• •••• ••••
            </p>
            <p className="text-sm font-semibold text-brand-text-heading">
              No card attached yet
            </p>
            <p className="text-sm text-brand-text-muted">
              Link a debit or credit card to keep your subscription active and
              enable renewals after your trial ends.
            </p>
          </div>

          <div className="flex items-end justify-between gap-4 text-brand-text-muted">
            <div>
              <p className="text-[10px] tracking-widest uppercase">Cardholder</p>
              <p className="text-sm">—</p>
            </div>
            <div className="text-end">
              <p className="text-[10px] tracking-widest uppercase">Expires</p>
              <p className="text-sm">—</p>
            </div>
          </div>
        </div>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {[
          { icon: Lock, label: "256-bit encrypted checkout" },
          { icon: ShieldCheck, label: "PCI compliant via Stripe" },
          { icon: CreditCard, label: "Visa, Mastercard, Amex" },
          { icon: ShieldCheck, label: "Cancel or update anytime" },
        ].map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-2 rounded-lg border border-border/60 bg-brand-background/60 px-3 py-2 text-xs text-brand-text-muted"
          >
            <item.icon className="size-3.5 shrink-0 text-brand-primary" />
            {item.label}
          </li>
        ))}
      </ul>

      <div className="flex justify-center sm:justify-start">
        <BillingActionButton
          label="Attach card"
          icon={<CreditCard aria-hidden />}
          isPending={isPending}
          onClick={onAttach}
          className="h-11 px-5 shadow-md shadow-brand-primary/20"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
