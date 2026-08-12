import type { LucideIcon } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

export interface SetupActionCardProps {
  href: string
  label: string
  description?: string
  icon: LucideIcon
  external?: boolean
  className?: string
}

export function SetupActionCard({
  href,
  label,
  description,
  icon: Icon,
  external = true,
  className,
}: SetupActionCardProps) {
  const content = (
    <>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
        <Icon aria-hidden className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-brand-text-heading">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs text-brand-text-muted">
            {description}
          </span>
        ) : null}
      </div>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="size-4 shrink-0 text-brand-text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </>
  )

  const classNames = cn(
    "flex items-center gap-4 rounded-xl border border-border bg-white px-4 py-4 transition-colors hover:border-brand-primary/40 hover:bg-brand-primary/5",
    className
  )

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classNames}>
        {content}
      </a>
    )
  }

  return (
    <Link href={href} className={classNames}>
      {content}
    </Link>
  )
}
