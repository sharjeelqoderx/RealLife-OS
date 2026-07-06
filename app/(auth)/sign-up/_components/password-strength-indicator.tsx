import { cn } from "@/lib/utils"
import { getPasswordStrength } from "@/lib/auth/password-strength"

export interface PasswordStrengthIndicatorProps {
  password: string
  className?: string
}

export function PasswordStrengthIndicator({
  password,
  className,
}: PasswordStrengthIndicatorProps) {
  const strength = getPasswordStrength(password)

  return (
    <div
      className={cn("flex gap-2", className)}
      role="progressbar"
      aria-valuenow={strength}
      aria-valuemin={0}
      aria-valuemax={3}
      aria-label="Password strength"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors",
            index < strength ? "bg-brand-primary" : "bg-brand-input-border"
          )}
        />
      ))}
    </div>
  )
}
