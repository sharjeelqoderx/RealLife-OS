import Image from "next/image"

import { cn } from "@/lib/utils"

/** Paths under `public/devices/` — drop real PNGs/JPGs with the same names. */
export const DEVICE_SETUP_IMAGES = {
  androidPhoneTop: "/devices/android-phone-top.svg",
  iphonePhoneTop: "/devices/iphone-phone-top.svg",
  qrCode: "/devices/qr-code.svg",
  cloudflareOneStoreListing: "/devices/cloudflare-one-store-listing.svg",
  cloudflareOneScreenshot: "/devices/cloudflare-one-screenshot.svg",
  orgNamePrompt: "/devices/org-name-prompt.svg",
  accessLogin: "/devices/access-login.svg",
  loginPinEmail: "/devices/login-pin-email.svg",
  dnsLeakStandardTest: "/devices/dns-leak-standard-test.svg",
  dnsLeakResults: "/devices/dns-leak-results.svg",
  iphoneSettingsSupervised: "/devices/iphone-settings-supervised.svg",
  supervisedDownload: "/devices/supervised-download.svg",
  supervisedFinder: "/devices/supervised-finder.svg",
  supervisedConnect: "/devices/supervised-connect.svg",
  supervisedConfirm: "/devices/supervised-confirm.svg",
  supervisedStolenDevice: "/devices/supervised-stolen-device.svg",
  supervisedFindMy: "/devices/supervised-find-my.svg",
  supervisedAppleId: "/devices/supervised-apple-id.svg",
  supervisedPrivateRelay: "/devices/supervised-private-relay.svg",
  installCertFinder: "/devices/install-cert-finder.svg",
  installCertDesktop: "/devices/install-cert-desktop.svg",
  installCertSpotlight: "/devices/install-cert-spotlight.svg",
  installCertVpn: "/devices/install-cert-vpn.svg",
} as const

export type DeviceSetupImageKey = keyof typeof DEVICE_SETUP_IMAGES

export interface SetupGuideImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  className?: string
  imageClassName?: string
}

export function SetupGuideImage({
  src,
  alt,
  width = 640,
  height = 400,
  priority = false,
  className,
  imageClassName,
}: SetupGuideImageProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-brand-surface",
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn("h-auto w-full object-contain", imageClassName)}
      />
    </div>
  )
}
