import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface WizardSubStepProps {
  step: number
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function WizardSubStep({
  step,
  title,
  description,
  children,
  className,
}: WizardSubStepProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <h4 className="text-sm font-semibold text-brand-text-heading">
          <span className="mr-2 inline-flex size-6 items-center justify-center rounded-md bg-muted text-xs font-bold text-brand-text-muted">
            {step}
          </span>
          {title}
        </h4>
        {description ? (
          <p className="mt-1 text-sm text-brand-text-muted">{description}</p>
        ) : null}
      </div>
      <div className="rounded-xl border border-border bg-brand-surface/60 p-4 md:p-6">
        {children}
      </div>
    </div>
  )
}
