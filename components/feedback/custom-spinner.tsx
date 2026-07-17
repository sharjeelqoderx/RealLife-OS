import { cn } from "@/lib/utils"

export interface CustomSpinnerProps {
  className?: string
}

/** Inline spinner for submit buttons (uses currentColor). */
export function CustomSpinner({ className }: CustomSpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current/30 border-t-current",
        className
      )}
    />
  )
}
