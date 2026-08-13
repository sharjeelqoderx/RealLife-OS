import Image from "next/image"

import { cn } from "@/lib/utils"

/** Paths under `public/` / `public/devices/` — drop real assets with the same names. */
export const DEVICE_SETUP_IMAGES = {
  androidPhoneTop: "/android.png",
  iphonePhoneTop: "/iphone.png",
  qrCode: "/devices/qr-code.svg",
  cloudflareOneStoreListing: "/DevicesImages/instal the app.png",
  cloudflareOneScreenshot: "/DevicesImages/instal the app.png",
  orgNamePrompt: "/DevicesImages/enter your team name.png",
  accessLogin: "/DevicesImages/sign in when promoted.png",
  loginPinEmail: "/DevicesImages/get login pin.png",
  dnsLeakStandardTest: "/DevicesImages/run a standard test.png",
  dnsLeakResults: "/DevicesImages/Check results for Cloudflare.png",
  iphoneSettingsSupervised: "/DevicesImages/images HD.png",
  supervisedDownload: "/devices/supervised-download.svg",
  supervisedFinder: "/DevicesImages/8 step/Open the downloaded file.png",
  supervisedConnect: "/DevicesImages/8 step/Plug the iPhone into your computer.png",
  supervisedConfirm: "/DevicesImages/8 step/Confirm Connected Device.png",
  supervisedStolenDevice: "/DevicesImages/8 step/Turn off Stolen Device Protection.png",
  supervisedFindMy: "/DevicesImages/8 step/Turn off Find My iPhone.png",
  supervisedAppleId: "/DevicesImages/8 step/Here's exactly how to turn off Find My iPhone.png",
  supervisedPrivateRelay: "/DevicesImages/8 step/Turn off Private Relay.png",
  supervisedPrivateRelayStep8: "/DevicesImages/8 step/Turn off Private Relay 8.png",
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
  style?: React.CSSProperties
}

export function SetupGuideImage({
  src,
  alt,
  width = 640,
  height = 400,
  priority = false,
  className,
  imageClassName,
  style,
}: SetupGuideImageProps) {
  const aspectRatio = width && height ? `${width} / ${height}` : undefined

  return (
    <div
      style={{
        ...style,
        width: style?.width ?? (width ? `${width}px` : undefined),
        maxWidth: style?.maxWidth ?? "100%",
        aspectRatio,
      }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-brand-surface h-auto",
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        priority={priority}
        unoptimized
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className={cn("object-contain", imageClassName)}
      />
    </div>
  )
}
