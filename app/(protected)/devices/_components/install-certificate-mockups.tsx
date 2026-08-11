import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface DesktopInstallerMockupProps {
  children: ReactNode
  showNext?: boolean
  className?: string
}

export function DesktopInstallerMockup({
  children,
  showNext = false,
  className,
}: DesktopInstallerMockupProps) {
  return (
    <div
      className={cn(
        "mx-auto max-w-md overflow-hidden rounded-xl border border-border bg-[#1e293b] shadow-md",
        className
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
      </div>
      <div className="px-6 py-8 text-center text-white">{children}</div>
      {showNext ? (
        <div className="border-t border-white/10 px-6 py-4">
          <Button
            type="button"
            className="w-full bg-orange-500 text-white hover:bg-orange-600"
            size="lg"
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function FinderFilesMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto max-w-md overflow-hidden rounded-xl border border-border bg-white shadow-sm",
        className
      )}
    >
      <div className="border-b border-border bg-brand-surface px-4 py-2 text-xs font-medium text-brand-text-muted">
        Downloads
      </div>
      <div className="divide-y divide-border">
        {[
          { name: "Cloudflare_WARP.pkg", active: true },
          { name: "Cloudflare_WARP.exe", active: false },
          { name: "readme.txt", active: false },
        ].map((file) => (
          <div
            key={file.name}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-sm",
              file.active && "bg-brand-primary/10 text-brand-primary"
            )}
          >
            <span className="size-8 rounded bg-brand-primary/15" />
            <span className="font-medium">{file.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminPasswordDialogMockup({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-auto max-w-md", className)}>
      <DesktopInstallerMockup showNext={false}>
        <div className="opacity-40">
          <p className="text-sm">Connect your iPhone or iPad</p>
        </div>
      </DesktopInstallerMockup>
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="w-full max-w-xs rounded-xl border border-border bg-white p-4 text-left shadow-xl">
          <p className="text-sm font-semibold text-brand-text-heading">
            Installer needs your permission
          </p>
          <p className="mt-1 text-xs text-brand-text-muted">
            Enter your administrator password to continue.
          </p>
          <div className="mt-3 h-9 rounded-lg border border-border bg-brand-input" />
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm">
              Cancel
            </Button>
            <Button type="button" size="sm">
              OK
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function IphoneSpotlightMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto max-w-xs overflow-hidden rounded-[2rem] border-4 border-[#1e293b] bg-white shadow-md",
        className
      )}
    >
      <div className="bg-brand-surface px-4 py-6">
        <div className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-brand-text-muted">
          Search
        </div>
        <div className="mt-4 space-y-2">
          <div className="rounded-lg bg-brand-primary/10 px-3 py-2 text-sm font-semibold text-brand-primary">
            Cloudflare One
          </div>
        </div>
      </div>
    </div>
  )
}

export function IphoneVpnManagementMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto max-w-xs overflow-hidden rounded-[2rem] border-4 border-[#1e293b] bg-white shadow-md",
        className
      )}
    >
      <div className="border-b border-border px-4 py-3 text-center text-sm font-semibold">
        General
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-center justify-between rounded-lg border-2 border-red-400 bg-red-50 px-3 py-2.5 text-sm font-medium text-brand-text-heading">
          <span>VPN &amp; Device Management</span>
          <span className="text-brand-text-muted">›</span>
        </div>
      </div>
    </div>
  )
}
