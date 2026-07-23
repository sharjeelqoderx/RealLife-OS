"use client"

import { CustomSpinner } from "@/components/feedback/custom-spinner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
