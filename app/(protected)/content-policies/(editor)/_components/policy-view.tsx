"use client"

import { useState } from "react"
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Eye,
  Flame,
  Pencil,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import type { GatewayPolicyDetail } from "@/lib/services/content-policies/gateway-policies"
import {
  buildPolicyConfigJson,
  slugifyFilename,
} from "@/lib/services/content-policies/policy-config-export"
import { cn } from "@/lib/utils"
import type { PolicyType } from "@/schemas/content-policies/policy"

const badgeClassByType: Record<PolicyType, string> = {
  allow: "bg-green-700 text-white hover:bg-green-700",
  block: "bg-red-600 text-white hover:bg-red-600",
  ytrestricted: "bg-gray-800 text-white hover:bg-gray-800",
  safesearch: "bg-blue-800 text-white hover:bg-blue-800",
}

function TypeIcon({ type }: { type: PolicyType }) {
  const classes = "size-5"
  switch (type) {
    case "allow":
      return (
        <div className="flex size-10 items-center justify-center rounded-md bg-green-50 text-green-700">
          <ShieldCheck className={classes} />
        </div>
      )
    case "block":
      return (
        <div className="flex size-10 items-center justify-center rounded-md bg-red-50 text-red-600">
          <ShieldAlert className={classes} />
        </div>
      )
    case "ytrestricted":
      return (
        <div className="flex size-10 items-center justify-center rounded-md bg-gray-100 text-gray-700">
          <Shield className={classes} />
        </div>
      )
    case "safesearch":
      return (
        <div className="flex size-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          <ShieldCheck className={classes} />
        </div>
      )
  }
}

function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function scheduleSummary(
  schedule: GatewayPolicyDetail["schedule"]
): string[] {
  if (!schedule) return []
  const days = [
    ["sun", "Sunday"],
    ["mon", "Monday"],
    ["tue", "Tuesday"],
    ["wed", "Wednesday"],
    ["thu", "Thursday"],
    ["fri", "Friday"],
    ["sat", "Saturday"],
  ] as const

  return days
    .map(([key, label]) => {
      const value = schedule[key]
      return value ? `${label}: ${value}` : null
    })
    .filter((v): v is string => Boolean(v))
}

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export interface PolicyViewProps {
  policy: GatewayPolicyDetail
  /** False when no Gateway DoH location exists — DNS profile button stays disabled. */
  dnsProfileAvailable?: boolean
}

export function PolicyView({
  policy,
  dnsProfileAvailable = false,
}: PolicyViewProps) {
  const scheduleLines = scheduleSummary(policy.schedule)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [dnsError, setDnsError] = useState("")
  const [isDnsDownloading, setIsDnsDownloading] = useState(false)

  const configJson = buildPolicyConfigJson(policy)

  const handleDownloadPolicyConfig = () => {
    downloadTextFile(
      `${slugifyFilename(policy.name)}.json`,
      configJson,
      "application/json"
    )
  }

  const handleDownloadDnsProfile = async () => {
    if (!dnsProfileAvailable) return
    setDnsError("")
    setIsDnsDownloading(true)
    try {
      const res = await fetch("/api/dns-profile/mobileconfig")
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string
        }
        throw new Error(body.error ?? "Failed to download DNS profile")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      const disposition = res.headers.get("Content-Disposition")
      const match = disposition?.match(/filename="([^"]+)"/)
      anchor.href = url
      anchor.download = match?.[1] ?? "reallife-os-dns.mobileconfig"
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setDnsError(
        error instanceof Error ? error.message : "Failed to download DNS profile"
      )
    } finally {
      setIsDnsDownloading(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-brand-text-muted hover:text-brand-primary"
            asChild
          >
            <Link href="/content-policies" aria-label="Back to content policies">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 items-center gap-2">
              <TypeIcon type={policy.type} />
              <h1 className="truncate text-2xl font-bold tracking-tight text-brand-text-heading md:text-3xl">
                {policy.name}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={cn(
                  "rounded text-[10px] font-bold tracking-wide",
                  badgeClassByType[policy.type]
                )}
              >
                {policy.typeLabel}
              </Badge>
              <Badge
                className={cn(
                  "rounded text-[10px] font-bold tracking-wide",
                  policy.status === "active"
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-200"
                )}
              >
                {policy.status.toUpperCase()}
              </Badge>
              <span className="truncate text-xs text-brand-text-muted">
                ID: {policy.id}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop: icon-only actions in one row (never wrap) */}
        <div className="hidden shrink-0 items-center gap-1 lg:flex">
          <Button
            type="button"
            variant="brandOutline"
            size="icon-sm"
            className="size-9"
            title="View config"
            aria-label="View config"
            onClick={() => setIsConfigOpen(true)}
          >
            <Eye className="size-4" />
          </Button>
          <Button
            type="button"
            variant="brandOutline"
            size="icon-sm"
            className="size-9"
            title="Download config"
            aria-label="Download config"
            onClick={handleDownloadPolicyConfig}
          >
            <Download className="size-4" />
          </Button>
          <span
            className="inline-flex"
            title={
              dnsProfileAvailable
                ? "Download DNS profile"
                : "No Gateway DNS location found"
            }
          >
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-9"
              aria-label="Download DNS profile"
              disabled={!dnsProfileAvailable || isDnsDownloading}
              onClick={handleDownloadDnsProfile}
            >
              <Smartphone className="size-4" />
            </Button>
          </span>
          <Button
            size="icon-sm"
            className="size-9"
            title="Edit policy"
            aria-label="Edit policy"
            asChild
          >
            <Link href={`/content-policies/${policy.id}/edit`}>
              <Pencil className="size-4" />
            </Link>
          </Button>
        </div>

        {/* Mobile + tablet: all actions in Flame dropdown */}
        <div className="shrink-0 lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-9 rounded-md text-brand-text-muted hover:bg-muted/60 hover:text-brand-text-heading"
                aria-label="Open policy actions"
              >
                <Flame className="size-4" strokeWidth={2} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 min-w-0 p-1">
              <DropdownMenuItem
                className="gap-2 px-2 py-1.5 text-xs"
                onClick={() => setIsConfigOpen(true)}
              >
                <Eye className="size-3.5" />
                View config
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 px-2 py-1.5 text-xs"
                onClick={handleDownloadPolicyConfig}
              >
                <Download className="size-3.5" />
                Download config
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 px-2 py-1.5 text-xs"
                disabled={!dnsProfileAvailable || isDnsDownloading}
                onClick={handleDownloadDnsProfile}
              >
                <Smartphone className="size-3.5" />
                {isDnsDownloading ? "Preparing…" : "DNS profile"}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem asChild className="gap-2 px-2 py-1.5 text-xs">
                <Link href={`/content-policies/${policy.id}/edit`}>
                  <Pencil className="size-3.5" />
                  Edit
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {dnsError ? (
        <p className="text-sm text-destructive">{dnsError}</p>
      ) : null}

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[720px] gap-0 p-0 sm:max-w-[720px]"
        >
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <DialogTitle className="text-lg font-semibold text-brand-text-heading">
              Policy config
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="brandOutline"
                size="sm"
                className="h-8"
                onClick={handleDownloadPolicyConfig}
              >
                <Download className="size-3.5" />
                Download
              </Button>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="rounded-md p-1.5 text-brand-text-muted hover:bg-muted hover:text-brand-text-heading"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
          <pre className="max-h-[60vh] overflow-auto bg-muted/30 px-5 py-4 font-mono text-xs leading-relaxed text-brand-text-heading whitespace-pre-wrap">
            {configJson}
          </pre>
          <p className="border-t border-border/60 px-5 py-3 text-xs text-brand-text-muted">
            Cloudflare has no download URL for Gateway policies. This JSON is
            exported by RealLife OS. Use &quot;DNS profile&quot; for the
            iOS/macOS .mobileconfig (DoH location).
          </p>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border/70 bg-brand-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-text-muted">
            Overview
          </h2>
          <Separator className="my-3" />
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-brand-text-muted">Action</dt>
              <dd className="font-medium text-brand-text-heading capitalize">
                {policy.action}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-text-muted">Enabled</dt>
              <dd className="font-medium text-brand-text-heading">
                {policy.enabled ? "Yes" : "No"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-text-muted">Filters</dt>
              <dd className="font-medium text-brand-text-heading">
                {policy.filters.join(", ") || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-text-muted">Precedence</dt>
              <dd className="font-medium text-brand-text-heading">
                {policy.precedence ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-text-muted">Source</dt>
              <dd className="font-medium text-brand-text-heading capitalize">
                {policy.source}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border/70 bg-brand-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-text-muted">
            Timestamps
          </h2>
          <Separator className="my-3" />
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-brand-text-muted">Created</dt>
              <dd className="font-medium text-brand-text-heading">
                {formatDate(policy.createdAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-text-muted">Updated</dt>
              <dd className="font-medium text-brand-text-heading">
                {formatDate(policy.updatedAt)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-lg border border-border/70 bg-brand-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-text-muted">
          Description
        </h2>
        <Separator className="my-3" />
        <p className="text-sm leading-relaxed text-brand-text-heading">
          {policy.description?.trim() || "No description provided."}
        </p>
      </section>

      <section className="rounded-lg border border-border/70 bg-brand-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-text-muted">
          Traffic expression
        </h2>
        <Separator className="my-3" />
        {policy.traffic ? (
          <pre className="overflow-x-auto rounded-md bg-muted/40 px-3 py-3 font-mono text-xs leading-relaxed text-brand-text-heading whitespace-pre-wrap">
            {policy.traffic}
          </pre>
        ) : (
          <p className="text-sm text-brand-text-muted">
            No traffic expression available for this policy.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-border/70 bg-brand-surface p-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-brand-text-muted" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-text-muted">
            Schedule
          </h2>
        </div>
        <Separator className="my-3" />
        {scheduleLines.length > 0 ? (
          <ul className="space-y-2 text-sm text-brand-text-heading">
            {scheduleLines.map((line) => (
              <li
                key={line}
                className="rounded-md border border-border/50 bg-white px-3 py-2"
              >
                {line}
              </li>
            ))}
            {policy.schedule?.time_zone ? (
              <li className="text-brand-text-muted">
                Time zone: {policy.schedule.time_zone}
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-sm text-brand-text-muted">
            This rule is always active (no schedule).
          </p>
        )}
      </section>
    </div>
  )
}

export function PolicyViewNotFound({ policyId }: { policyId: string }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="text-lg font-semibold text-brand-text-heading">
        Policy not found
      </p>
      <p className="max-w-md text-sm text-brand-text-muted">
        No policy matched ID{" "}
        <span className="font-mono text-brand-text-heading">{policyId}</span>.
      </p>
      <Button asChild>
        <Link href="/content-policies">Back to policies</Link>
      </Button>
    </div>
  )
}
