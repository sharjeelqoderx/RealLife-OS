import { cn } from "@/lib/utils"

export interface ErrorAlertProps {
  message: string
  className?: string
}

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  if (!message.trim()) return null

  return (
    <p
      role="alert"
      className={cn(
        "rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive",
        className
      )}
    >
      {message}
    </p>
  )
}
