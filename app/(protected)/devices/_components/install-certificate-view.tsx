"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Laptop, Smartphone } from "lucide-react"

import {
  AdminPasswordDialogMockup,
  DesktopInstallerMockup,
  FinderFilesMockup,
  IphoneSpotlightMockup,
  IphoneVpnManagementMockup,
} from "@/app/(protected)/devices/_components/install-certificate-mockups"
import { PhonePreview } from "@/app/(protected)/devices/_components/phone-preview"
import { SetupStep } from "@/app/(protected)/devices/_components/setup-step"
import { Button } from "@/components/ui/button"
import type { DevicePlatform } from "@/schemas/devices/device"

export interface InstallCertificateViewProps {
  platform?: DevicePlatform
  warpDownloadUrls: {
    macos: string
    windows: string
  }
  dnsProfileAvailable: boolean
}

export function InstallCertificateView({
  platform = "iphone",
  warpDownloadUrls,
  dnsProfileAvailable,
}: InstallCertificateViewProps) {
  const router = useRouter()

  return (
    <div className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-3xl flex-col bg-white">
      <Button variant="ghost" size="sm" asChild className="-ms-2 mb-4 self-start">
        <Link href={`/devices/setup?platform=${platform}`}>
          <ArrowLeft aria-hidden className="size-4" />
          Back to device setup
        </Link>
      </Button>

      <div className="border-b border-border pb-8 text-center">
        <h1 className="text-xl font-bold text-brand-text-heading md:text-2xl">
          Installing Certificate
        </h1>
        <div className="mx-auto mt-6 max-w-[180px]">
          <PhonePreview platform={platform} className="h-32 max-w-none" />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-brand-text-heading">
          Installing the Cloudflare WARP Desktop
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-text-muted">
          Download and run the Cloudflare WARP desktop installer on your Mac or PC,
          then connect your iPhone or iPad to install and trust the certificate profile.
        </p>
      </div>

      <div className="mt-8">
        <SetupStep
          step={1}
          title="Download the installation file from your portal"
          description="Download the Cloudflare WARP installer for your computer."
        >
          <div className="space-y-3 rounded-xl border border-border bg-white p-4">
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a
                  href={warpDownloadUrls.macos}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download for macOS
                </a>
              </Button>
              <Button asChild size="lg">
                <a
                  href={warpDownloadUrls.windows}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download for Windows
                </a>
              </Button>
            </div>
            {dnsProfileAvailable ? (
              <Button asChild variant="brandOutline" size="sm">
                <a href="/api/dns-profile/mobileconfig">Download Profile</a>
              </Button>
            ) : null}
          </div>
        </SetupStep>

        <SetupStep
          step={2}
          title="Open the installer file"
          description="Navigate to your downloads folder and double-click the installer file."
        >
          <FinderFilesMockup />
        </SetupStep>

        <SetupStep
          step={3}
          title="Follow the installation prompts"
          description="Launch the installer and connect your iPhone or iPad when prompted."
        >
          <DesktopInstallerMockup showNext>
            <div className="mx-auto mb-4 flex items-center justify-center gap-3">
              <Laptop aria-hidden className="size-10 text-brand-primary/80" />
              <span className="text-white/40">—</span>
              <Smartphone aria-hidden className="size-8 text-white/80" />
            </div>
            <p className="text-sm font-medium">Connect your iPhone or iPad</p>
          </DesktopInstallerMockup>
        </SetupStep>

        <SetupStep
          step={4}
          title="Enter your administrator password"
          description="Approve the installer with your Mac or PC administrator password."
        >
          <AdminPasswordDialogMockup />
        </SetupStep>

        <SetupStep
          step={5}
          title="Open the WARP app on your device"
          description="Use Spotlight Search on your iPhone or iPad to open Cloudflare One."
        >
          <IphoneSpotlightMockup />
        </SetupStep>

        <SetupStep
          step={6}
          title="Enable the WARP client"
          description="Turn off Find My iPhone in Settings › [Your Name] › Find My before continuing."
        >
          <div className="space-y-4">
            <DesktopInstallerMockup showNext>
              <p className="text-sm font-medium">Turn off Find My iPhone</p>
            </DesktopInstallerMockup>
            <IphoneSupervisedSettingsCompact />
          </div>
        </SetupStep>

        <SetupStep
          step={7}
          title="Trust the Cloudflare certificate"
          description="If you use iCloud+, turn off Private Relay under Settings › [Your Name] › iCloud."
        >
          <DesktopInstallerMockup showNext>
            <p className="text-sm font-medium">Turn Off Private Relay</p>
          </DesktopInstallerMockup>
        </SetupStep>

        <SetupStep
          step={8}
          title="Connect to the Cloudflare network"
          description="Open VPN & Device Management on your device and install the downloaded profile."
          isLast
        >
          <div className="space-y-4">
            <IphoneVpnManagementMockup />
            <DesktopInstallerMockup showNext>
              <p className="text-sm font-medium">Turn Off Private Relay</p>
            </DesktopInstallerMockup>
          </div>
        </SetupStep>
      </div>

      <div className="mt-10 flex items-center justify-end gap-3 border-t border-border pt-6">
        <Button type="button" variant="outline" size="lg" asChild>
          <Link href={`/devices/setup?platform=${platform}`}>Back</Link>
        </Button>
        <Button type="button" size="lg" onClick={() => router.push("/devices")}>
          Finish
        </Button>
      </div>
    </div>
  )
}

function IphoneSupervisedSettingsCompact() {
  return (
    <div className="mx-auto max-w-xs overflow-hidden rounded-[2rem] border-4 border-[#1e293b] bg-white shadow-md">
      <div className="border-b border-border px-4 py-3 text-center text-sm font-semibold">
        Apple ID
      </div>
      <div className="space-y-1 p-3">
        {["Name, Phone Numbers, Email", "Password & Security", "Find My"].map(
          (item) => (
            <div
              key={item}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-brand-text-heading"
            >
              <span>{item}</span>
              <span className="text-brand-text-muted">›</span>
            </div>
          )
        )}
      </div>
    </div>
  )
}
