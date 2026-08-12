"use client"

import { useCallback, useState } from "react"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface CopyFieldProps {
  value: string
  label?: string
  className?: string
}

export function CopyField({ value, label, className }: CopyFieldProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [value])

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <p className="text-sm font-medium text-brand-text-heading">{label}</p>
      ) : null}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-brand-surface px-4 py-3">
        <code className="flex-1 truncate text-sm font-semibold text-brand-text-heading">
          {value}
        </code>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={copied ? "Copied" : "Copy to clipboard"}
          onClick={handleCopy}
        >
          {copied ? (
            <Check aria-hidden className="size-4 text-brand-primary" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
