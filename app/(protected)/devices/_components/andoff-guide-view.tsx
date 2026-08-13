"use client"

import Link from "next/link"
import { ArrowLeft, Download, HelpCircle } from "lucide-react"

import {
  DEVICE_SETUP_IMAGES,
  SetupGuideImage,
} from "@/app/(protected)/devices/_components/setup-guide-image"
import { PhonePreview } from "@/app/(protected)/devices/_components/phone-preview"
import { WizardSubStep } from "@/app/(protected)/devices/_components/wizard-sub-step"
import { Button } from "@/components/ui/button"

export function AndoffGuideView() {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-3xl flex-col">
      <Button variant="ghost" size="sm" asChild className="-ms-2 mb-4 self-start">
        <Link href="/devices/setup?platform=iphone">
          <ArrowLeft aria-hidden className="size-4" />
          Back to device setup
        </Link>
      </Button>

      <section className="space-y-8 border-b border-border pb-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-brand-text-heading md:text-3xl">
          Generate Certificates
        </h1>
        <div className="mx-auto max-w-[220px]">
          <PhonePreview platform="iphone" />
        </div>
      </section>

      <section className="mt-10 space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-brand-text-heading md:text-2xl">
            Installing the Cloudflare WARP Enforcer
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-brand-text-muted">
            Follow these steps to enable supervised mode on your iPhone. This process
            unlocks stronger bypass prevention and keeps your content policy active.
          </p>
        </div>

        <WizardSubStep
          step={1}
          title="Download Tech Lockdown's Supervised Mode Setup tool"
          description="On your Mac computer, click a button below to download the software."
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="flex flex-col items-center space-y-3">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <a href="#" aria-label="Download for Mac Apple Silicon">
                  <Download aria-hidden className="size-4" />
                  Download for Mac (Apple Silicon)
                </a>
              </Button>
              <p className="text-[11px] tracking-wide uppercase text-brand-text-muted">
                M series Macs purchased after November 2020
              </p>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <a href="#" aria-label="Download for Mac Intel">
                  <Download aria-hidden className="size-4" />
                  Download for Mac (Intel)
                </a>
              </Button>
              <p className="text-[11px] tracking-wide uppercase text-brand-text-muted">
                Macs purchased before November 2020
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <HelpCircle aria-hidden className="size-4" />
              Not sure which to download?
            </Button>
          </div>
        </WizardSubStep>

        <WizardSubStep
          step={2}
          title="Open the downloaded file"
          description="Unzip the downloaded file and open the app that was extracted."
        >
          <SetupGuideImage
            src={DEVICE_SETUP_IMAGES.supervisedFinder}
            alt="Finder showing the downloaded Andoff application"
            width={640}
            height={400}
          />
        </WizardSubStep>

        <WizardSubStep
          step={3}
          title="Plug the iPhone into your computer"
          description="Use your Apple charging cable to plug the iPhone into your computer. Unlock it and trust the computer if prompted."
        >
          <SetupGuideImage
            src={DEVICE_SETUP_IMAGES.supervisedConnect}
            alt="iPhone connected to Mac with charging cable"
            width={560}
            height={480}
            className="mx-auto max-w-md"
          />
        </WizardSubStep>

        <WizardSubStep
          step={4}
          title="Confirm Connected Device"
          description="Confirm to enable supervised mode on your iPhone."
        >
          <SetupGuideImage
            src={DEVICE_SETUP_IMAGES.supervisedConfirm}
            alt="Confirm connected device dialog in Andoff"
            width={560}
            height={480}
            className="mx-auto max-w-md"
          />
        </WizardSubStep>

        <WizardSubStep
          step={5}
          title="Turn off Stolen Device Protection"
          description="You'll need to temporarily turn off Stolen Device Protection. Here's exactly how to turn it off:"
        >
          <SetupGuideImage
            src={DEVICE_SETUP_IMAGES.supervisedStolenDevice}
            alt="iPhone settings screen for Stolen Device Protection"
            width={400}
            height={640}
            className="mx-auto max-w-xs"
          />
        </WizardSubStep>

        <WizardSubStep
          step={6}
          title="Turn off Find My iPhone"
          description="You'll be prompted to temporarily turn off Find My iPhone."
        >
          <div className="space-y-6">
            <SetupGuideImage
              src={DEVICE_SETUP_IMAGES.supervisedFindMy}
              alt="Turn off Find My iPhone screen in Andoff"
              width={560}
              height={480}
              className="mx-auto max-w-md"
            />
            <p className="text-sm leading-relaxed text-brand-text-muted">
              After enabling supervised mode and disabling Find My iPhone, return to
              the device and ensure you see the banner below:
            </p>
            <SetupGuideImage
              src={DEVICE_SETUP_IMAGES.supervisedAppleId}
              alt="iPhone Settings showing Apple ID banner"
              width={360}
              height={560}
              className="mx-auto max-w-xs"
            />
          </div>
        </WizardSubStep>

        <WizardSubStep
          step={7}
          title="Turn OFF Private Relay"
          description="You'll be prompted to temporarily turn off Private Relay. This is a feature only available with iCloud+, so this may not apply to you."
        >
          <SetupGuideImage
            src={DEVICE_SETUP_IMAGES.supervisedPrivateRelay}
            alt="Turn off Private Relay screen in Andoff"
            width={560}
            height={480}
            className="mx-auto max-w-md"
          />
        </WizardSubStep>

        <WizardSubStep
          step={8}
          title="Turn OFF Private Relay"
          description="You'll need to confirm this setting on the iPhone itself. You can re-enable these features after the setup completes."
        >
          <SetupGuideImage
            src={DEVICE_SETUP_IMAGES.supervisedPrivateRelayStep8}
            alt="iPhone Private Relay confirmation screen"
            width={560}
            height={480}
            className="mx-auto max-w-md"
          />
        </WizardSubStep>
      </section>

      <div className="mt-12 flex items-center justify-end gap-3 border-t border-border pt-6">
        <Button type="button" variant="outline" size="lg" asChild>
          <Link href="/devices/setup?platform=iphone">Previous</Link>
        </Button>
        <Button type="button" size="lg" asChild>
          <Link href="/devices/setup?platform=iphone">Next</Link>
        </Button>
      </div>
    </div>
  )
}
