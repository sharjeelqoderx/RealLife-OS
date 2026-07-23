"use client"

import { CreditCard, Lock, ShieldCheck } from "lucide-react"

import { CustomSpinner } from "@/components/feedback/custom-spinner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
          <CreditCard className="size-6" aria-hidden />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-base font-semibold text-brand-text-heading">
              No card on file
            </p>
            <p className="mt-1 text-sm text-brand-text-muted">
              Add a debit or credit card to keep your subscription active and
              enable renewals after your trial ends.
            </p>
          </div>

          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-text-muted">
            <li className="inline-flex items-center gap-1.5">
              <Lock className="size-3.5 shrink-0" aria-hidden />
              Encrypted checkout
            </li>
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
              Secured by Stripe
            </li>
          </ul>
        </div>
      </div>

      <div className="flex justify-center">
        <BillingActionButton
          label="Add card"
          icon={<CreditCard aria-hidden />}
          isPending={isPending}
          onClick={onAttach}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export interface BillingActionButtonProps {
  label: string
  icon: React.ReactNode
  isPending: boolean
  onClick: () => void
  variant?: "primary" | "outline"
  className?: string
}

export function BillingActionButton({
  label,
  icon,
  isPending,
  onClick,
  variant = "primary",
  className,
}: BillingActionButtonProps) {
  return (
    <Button
      type="button"
      disabled={isPending}
      onClick={onClick}
      className={cn(
        "h-10 min-w-[9.5rem] gap-2 px-4 text-sm font-semibold",
        variant === "primary"
          ? "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90"
          : "border border-brand-primary bg-brand-surface text-brand-primary hover:bg-brand-primary/5",
        className
      )}
    >
      {isPending ? <CustomSpinner /> : icon}
      {label}
    </Button>
  )
}
