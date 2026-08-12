import {
  DEVICE_SETUP_IMAGES,
  SetupGuideImage,
} from "@/app/(protected)/devices/_components/setup-guide-image"
import { cn } from "@/lib/utils"

export function FinderFilesMockup({ className }: { className?: string }) {
  return (
    <SetupGuideImage
      src={DEVICE_SETUP_IMAGES.installCertFinder}
      alt="Downloads folder screenshot — replace public/devices/install-cert-finder.svg"
      width={640}
      height={400}
      className={cn("mx-auto max-w-md", className)}
    />
  )
}

export function DesktopInstallerMockup({
  className,
  variant = "desktop",
}: {
  className?: string
  variant?: "desktop" | "find-my" | "private-relay"
}) {
  const src =
    variant === "find-my"
      ? DEVICE_SETUP_IMAGES.supervisedFindMy
      : variant === "private-relay"
        ? DEVICE_SETUP_IMAGES.supervisedPrivateRelay
        : DEVICE_SETUP_IMAGES.installCertDesktop

  const alt =
    variant === "find-my"
      ? "Turn off Find My — replace public/devices/supervised-find-my.svg"
      : variant === "private-relay"
        ? "Turn off Private Relay — replace public/devices/supervised-private-relay.svg"
        : "Desktop installer window — replace public/devices/install-cert-desktop.svg"

  return (
    <SetupGuideImage
      src={src}
      alt={alt}
      width={560}
      height={420}
      className={cn("mx-auto max-w-md", className)}
    />
  )
}

export function AdminPasswordDialogMockup({ className }: { className?: string }) {
  return (
    <SetupGuideImage
      src={DEVICE_SETUP_IMAGES.installCertDesktop}
      alt="Administrator password dialog — replace public/devices/install-cert-desktop.svg"
      width={560}
      height={420}
      className={cn("mx-auto max-w-md", className)}
    />
  )
}

export function IphoneSpotlightMockup({ className }: { className?: string }) {
  return (
    <SetupGuideImage
      src={DEVICE_SETUP_IMAGES.installCertSpotlight}
      alt="iPhone Spotlight search — replace public/devices/install-cert-spotlight.svg"
      width={360}
      height={640}
      className={cn("mx-auto max-w-xs", className)}
    />
  )
}

export function IphoneVpnManagementMockup({ className }: { className?: string }) {
  return (
    <SetupGuideImage
      src={DEVICE_SETUP_IMAGES.installCertVpn}
      alt="VPN and Device Management settings — replace public/devices/install-cert-vpn.svg"
      width={360}
      height={640}
      className={cn("mx-auto max-w-xs", className)}
    />
  )
}
