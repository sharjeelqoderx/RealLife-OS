import {
  DEVICE_SETUP_IMAGES,
  SetupGuideImage,
} from "@/app/(protected)/devices/_components/setup-guide-image"
import { cn } from "@/lib/utils"
import type { DevicePlatform } from "@/schemas/devices/device"

export interface PhonePreviewProps {
  platform: DevicePlatform
  className?: string
}

export function PhonePreview({ platform, className }: PhonePreviewProps) {
  const isAndroid = platform === "android"
  const src = isAndroid
    ? DEVICE_SETUP_IMAGES.androidPhoneTop
    : DEVICE_SETUP_IMAGES.iphonePhoneTop
  const alt = isAndroid ? "Android device preview" : "iPhone device preview"

  return (
    <SetupGuideImage
      src={src}
      alt={alt}
      width={280}
      height={160}
      className={cn("mx-auto w-full max-w-[160px] border-0 bg-transparent shadow-none", className)}
      imageClassName="rounded-t-[1.75rem]"
    />
  )
}
