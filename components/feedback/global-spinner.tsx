import { Spinner } from "@/components/feedback/spinner"
import { cn } from "@/lib/utils"

export interface GlobalSpinnerProps {
  className?: string
  label?: string
}

export function GlobalSpinner({
  className,
  label = "Loading",
}: GlobalSpinnerProps) {
  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-[2px]",
        className
      )}
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-brand-surface px-8 py-7 shadow-[0_8px_30px_var(--brand-shadow)] ring-1 ring-brand-input-border">
        <Spinner label={label} />
        <p className="text-sm font-medium text-brand-text-muted">{label}</p>
      </div>
    </div>
  )
}
