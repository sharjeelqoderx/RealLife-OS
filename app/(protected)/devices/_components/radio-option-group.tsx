"use client"

import { cn } from "@/lib/utils"

export interface RadioOptionGroupProps<T extends string> {
  name: string
  value: T | undefined
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}

export function RadioOptionGroup<T extends string>({
  name,
  value,
  options,
  onChange,
  className,
}: RadioOptionGroupProps<T>) {
  return (
    <div className={cn("flex flex-wrap gap-6", className)} role="radiogroup">
      {options.map((option) => {
        const isSelected = value === option.value
        const inputId = `${name}-${option.value}`

        return (
          <label
            key={option.value}
            htmlFor={inputId}
            className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-brand-text-heading"
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border-2 transition-colors",
                isSelected
                  ? "border-brand-primary bg-brand-primary"
                  : "border-border bg-white"
              )}
            >
              {isSelected ? (
                <span className="size-2 rounded-full bg-white" />
              ) : null}
            </span>
            <input
              id={inputId}
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        )
      })}
    </div>
  )
}
