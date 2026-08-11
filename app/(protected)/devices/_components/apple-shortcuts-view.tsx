"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { QrCodePlaceholder } from "@/app/(protected)/devices/_components/qr-code-placeholder"
import { Button } from "@/components/ui/button"

const SHORTCUT_STEPS = [
  {
    step: 1,
    title: "Open the Shortcuts app on your iPhone",
    description: "Shortcuts comes pre-installed on iOS.",
  },
  {
    step: 2,
    title: "Add the Cloudflare VPN shortcut",
    description: "Import the RealLife OS shortcut to reconnect Cloudflare One automatically.",
  },
  {
    step: 3,
    title: "Enable automation",
    description: "Create a personal automation when Cloudflare One disconnects.",
  },
] as const

export function AppleShortcutsView() {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-3xl flex-col gap-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ms-2 mb-4">
          <Link href="/devices/setup?platform=iphone">
            <ArrowLeft aria-hidden className="size-4" />
            Back to device setup
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-brand-text-heading md:text-3xl">
          Enable Apple Shortcuts
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-text-muted">
          Use Apple Shortcuts to automatically re-connect the Cloudflare VPN when
          it disconnects on supervised iOS devices.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-brand-surface/60 p-6">
        <QrCodePlaceholder caption="Scan to open Shortcuts on your iPhone" />
      </div>

      <div className="space-y-6">
        {SHORTCUT_STEPS.map((item) => (
          <section
            key={item.step}
            className="rounded-xl border border-border bg-white p-5"
          >
            <h2 className="text-sm font-semibold text-brand-text-heading">
              {item.step}. {item.title}
            </h2>
            <p className="mt-2 text-sm text-brand-text-muted">{item.description}</p>
          </section>
        ))}
      </div>

      <div className="flex justify-end">
        <Button asChild size="lg">
          <Link href="/devices">Finish setup</Link>
        </Button>
      </div>
    </div>
  )
}
