import { cn } from "@/lib/utils"

export interface SpinnerProps {
  className?: string
  label?: string
}

export function Spinner({ className, label = "Loading" }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("relative size-12", className)}
    >
      <span className="absolute inset-0 animate-spin rounded-full border-4 border-brand-primary/15 border-t-brand-primary" />
      <span className="absolute inset-1.5 animate-spin rounded-full border-4 border-brand-primary/10 border-b-brand-primary [animation-direction:reverse] [animation-duration:1.4s]" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
