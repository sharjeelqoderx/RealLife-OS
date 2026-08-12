import { cn } from "@/lib/utils"

export interface WarningAlertProps {
  message: string
  className?: string
}

export function WarningAlert({ message, className }: WarningAlertProps) {
  if (!message.trim()) return null

  return (
    <p
      role="status"
      className={cn(
        "rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-brand-text-heading",
        className
      )}
    >
      {message}
    </p>
  )
}
