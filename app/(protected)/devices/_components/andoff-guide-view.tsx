"use client"

import Link from "next/link"
import { ArrowLeft, Download, HelpCircle } from "lucide-react"

import {
  DEVICE_SETUP_IMAGES,
  SetupGuideImage,
} from "@/app/(protected)/devices/_components/setup-guide-image"
import { PhonePreview } from "@/app/(protected)/devices/_components/phone-preview"
import { SetupStep } from "@/app/(protected)/devices/_components/setup-step"
import { Button } from "@/components/ui/button"

const SUPERVISED_GUIDE_STEPS: Array<{
  id: string
  title: string
  description: string
  imageSrc: string
  imageAlt: string
  showDownloads?: boolean
}> = [
  {
    id: "download",
    title: "Download Tech Lockdown's Supervised Mode Setup tool",
    description:
      "On your Mac computer, click a button below to download the software.",
    imageSrc: DEVICE_SETUP_IMAGES.supervisedDownload,
    imageAlt:
      "Supervised mode download buttons — replace public/devices/supervised-download.svg",
    showDownloads: true,
  },
  {
    id: "open-download",
    title: "Open the downloaded file",
    description: "Unzip the downloaded file and open the app that was extracted.",
    imageSrc: DEVICE_SETUP_IMAGES.supervisedFinder,
    imageAlt:
      "Finder Downloads folder — replace public/devices/supervised-finder.svg",
  },
  {
    id: "plug-in",
    title: "Plug the iPhone into your computer",
    description:
      "Use your Apple charging cable to plug the iPhone into your computer, unlock it, and trust the computer if prompted.",
    imageSrc: DEVICE_SETUP_IMAGES.supervisedConnect,
    imageAlt:
      "Connect iPhone trust prompt — replace public/devices/supervised-connect.svg",
  },
  {
    id: "confirm-device",
    title: "Confirm Connected Device",
    description: "Click yes to confirm the connected device.",
    imageSrc: DEVICE_SETUP_IMAGES.supervisedConfirm,
    imageAlt:
      "Confirm connected device dialog — replace public/devices/supervised-confirm.svg",
  },
  {
    id: "stolen-device",
    title: "Turn off Stolen Device Protection",
    description:
      "You'll need to temporarily turn off Stolen Device Protection. Here's exactly how to turn it off:",
    imageSrc: DEVICE_SETUP_IMAGES.supervisedStolenDevice,
    imageAlt:
      "Stolen Device Protection settings — replace public/devices/supervised-stolen-device.svg",
  },
  {
    id: "find-my",
    title: "Turn off Find My iPhone",
    description: "You'll be prompted to temporarily turn off Find My iPhone.",
    imageSrc: DEVICE_SETUP_IMAGES.supervisedFindMy,
    imageAlt:
      "Turn off Find My iPhone — replace public/devices/supervised-find-my.svg",
  },
  {
    id: "apple-id",
    title: "Open your Apple Account settings",
    description: "Here's exactly how to turn off Find My iPhone from Settings:",
    imageSrc: DEVICE_SETUP_IMAGES.supervisedAppleId,
    imageAlt:
      "Apple Account settings highlight — replace public/devices/supervised-apple-id.svg",
  },
  {
    id: "private-relay",
    title: "Turn off Private Relay",
    description:
      "You'll be prompted to temporarily turn off Private Relay. This is a feature only available with iCloud+, so this may not apply to you.",
    imageSrc: DEVICE_SETUP_IMAGES.supervisedPrivateRelay,
    imageAlt:
      "Turn off Private Relay — replace public/devices/supervised-private-relay.svg",
  },
]

export function AndoffGuideView() {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-3xl flex-col">
      <Button variant="ghost" size="sm" asChild className="-ms-2 mb-4 self-start">
        <Link href="/devices/setup?platform=iphone">
          <ArrowLeft aria-hidden className="size-4" />
          Back to device setup
        </Link>
      </Button>

      <div className="border-b border-border pb-8 text-center">
        <h1 className="text-xl font-bold text-brand-text-heading md:text-2xl">
          Cloudflare Certificate
        </h1>
        <div className="mx-auto mt-6 max-w-[200px]">
          <PhonePreview platform="iphone" />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-brand-text-heading md:text-xl">
          Installing the Cloudflare WARP Enforcer
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-text-muted">
          Follow these steps to enable supervised mode on your iPhone. This process
          unlocks stronger bypass prevention and keeps your content policy active.
        </p>
      </div>

      <div className="mt-8">
        {SUPERVISED_GUIDE_STEPS.map((step, index) => (
          <SetupStep
            key={step.id}
            step={index + 1}
            title={step.title}
            description={step.description}
            isLast={index === SUPERVISED_GUIDE_STEPS.length - 1}
          >
            {step.showDownloads ? (
              <div className="space-y-4">
                <div className="space-y-3 rounded-xl border border-border bg-brand-surface p-4">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <a href="#" aria-label="Download for Mac Apple Silicon">
                      <Download aria-hidden className="size-4" />
                      Download for Mac (Apple Silicon)
                    </a>
                  </Button>
                  <p className="text-[11px] tracking-wide text-brand-text-muted uppercase">
                    M series Macs purchased after November 2020
                  </p>
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <a href="#" aria-label="Download for Mac Intel">
                      <Download aria-hidden className="size-4" />
                      Download for Mac (Intel)
                    </a>
                  </Button>
                  <p className="text-[11px] tracking-wide text-brand-text-muted uppercase">
                    Macs purchased before November 2020
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-full">
                  <HelpCircle aria-hidden className="size-4" />
                  Not sure which to download?
                </Button>
                <SetupGuideImage
                  src={step.imageSrc}
                  alt={step.imageAlt}
                  width={640}
                  height={360}
                />
              </div>
            ) : (
              <SetupGuideImage
                src={step.imageSrc}
                alt={step.imageAlt}
                width={640}
                height={400}
              />
            )}
          </SetupStep>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-end gap-3 border-t border-border pt-6">
        <Button type="button" variant="outline" size="lg" asChild>
          <Link href="/devices/setup?platform=iphone">Back</Link>
        </Button>
        <Button type="button" size="lg" asChild>
          <Link href="/devices/setup?platform=iphone">Done</Link>
        </Button>
      </div>
    </div>
  )
}
