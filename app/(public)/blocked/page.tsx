import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { ShieldBan } from "lucide-react"

import { REALIFE_BLOCK_PAGE_HEADER } from "@/lib/services/cloudflare/gateway-block-page"

export const metadata: Metadata = {
  title: "Site blocked — RealLife OS",
  robots: { index: false, follow: false },
}

type BlockedPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | null {
  const value = params[key]
  if (typeof value === "string" && value.trim()) return value.trim()
  if (Array.isArray(value) && value[0]?.trim()) return value[0].trim()
  return null
}

function formatBlockedSite(siteUri: string | null): string | null {
  if (!siteUri) return null
  try {
    if (siteUri.includes("://")) {
      return new URL(siteUri).hostname
    }
    return siteUri.replace(/^\/+/, "")
  } catch {
    return siteUri
  }
}

export default async function BlockedPage({ searchParams }: BlockedPageProps) {
  const params = await searchParams
  const siteUri = readParam(params, "cf_site_uri")
  const categories = readParam(params, "cf_request_categories")
  const blockedSite = formatBlockedSite(siteUri)

  return (
    <div className="min-h-screen bg-linear-to-br from-brand-background-gradient-start via-brand-background to-brand-background-gradient-end px-4 py-10">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt="RealLife OS"
          width={1224}
          height={296}
          priority
          className="h-auto w-full max-w-[240px] object-contain"
        />

        <div className="mt-10 flex size-16 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
          <ShieldBan className="size-8" aria-hidden />
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-brand-text-heading">
          {REALIFE_BLOCK_PAGE_HEADER}
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-brand-text-muted">
          A content policy on your RealLife OS account blocked this request.
          Native apps may show a generic error instead of this page.
        </p>

        {blockedSite ? (
          <div className="mt-8 w-full rounded-xl border border-border bg-brand-surface px-4 py-3 text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-text-muted">
              Blocked site
            </p>
            <p className="mt-1 break-all text-sm font-semibold text-brand-text-heading">
              {blockedSite}
            </p>
          </div>
        ) : null}

        {categories ? (
          <div className="mt-3 w-full rounded-xl border border-border bg-brand-surface px-4 py-3 text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-text-muted">
              Categories
            </p>
            <p className="mt-1 text-sm text-brand-text-heading">{categories}</p>
          </div>
        ) : null}

        <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/content-policies"
            className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-brand-primary-foreground transition-colors hover:bg-brand-primary/90"
          >
            Manage content policies
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-brand-surface px-5 py-2.5 text-sm font-semibold text-brand-text-heading transition-colors hover:bg-brand-background"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
