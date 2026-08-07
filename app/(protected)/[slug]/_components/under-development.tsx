import Link from "next/link"
import { ArrowLeft, Construction } from "lucide-react"

import { Button } from "@/components/ui/button"

export type UnderDevelopmentProps = {
  /** URL path segments, e.g. ["devices"] or ["activity-logs"]. */
  segments: string[]
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function UnderDevelopment({ segments }: UnderDevelopmentProps) {
  const path = `/${segments.join("/")}`
  const title =
    segments.length > 0
      ? segments.map(titleFromSlug).join(" / ")
      : "This page"

  return (
    <div className="flex min-h-[min(560px,calc(100svh-8rem))] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
        <Construction className="size-7" aria-hidden />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-text-muted">
        Under development
      </p>
      <h1 className="mt-2 max-w-lg text-2xl font-bold tracking-tight text-brand-text-heading md:text-3xl">
        {title}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-text-muted">
        <span className="font-mono text-brand-text-heading">{path} </span> isn&apos;t
        ready yet. We&apos;re building this area - check back soon.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button variant="brandOutline" asChild>
          <Link href="/content-policies" className="gap-1.5">
            <ArrowLeft className="size-4" />
            Content policies
          </Link>
        </Button>
      </div>
    </div>
  )
}
