import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface SetupStepProps {
  step: number
  title: string
  description?: string
  children: ReactNode
  isLast?: boolean
  className?: string
}

export function SetupStep({
  step,
  title,
  description,
  children,
  isLast = false,
  className,
}: SetupStepProps) {
  return (
    <div className={cn("relative flex gap-4", className)}>
      <div className="flex flex-col items-center">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-brand-text-muted">
          {step}
        </div>
        {!isLast ? (
          <div className="mt-2 w-px flex-1 bg-border" aria-hidden />
        ) : null}
      </div>

      <div className={cn("min-w-0 flex-1 pb-10", isLast && "pb-0")}>
        <h3 className="text-base font-semibold text-brand-text-heading">{title}</h3>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-brand-text-muted">
            {description}
          </p>
        ) : null}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
