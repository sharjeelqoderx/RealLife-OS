import {
  DEVICE_SETUP_IMAGES,
  SetupGuideImage,
} from "@/app/(protected)/devices/_components/setup-guide-image"
import { cn } from "@/lib/utils"

export interface QrCodePlaceholderProps {
  caption?: string
  className?: string
}

export function QrCodePlaceholder({ caption, className }: QrCodePlaceholderProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <SetupGuideImage
        src={DEVICE_SETUP_IMAGES.qrCode}
        alt="QR code placeholder — replace public/devices/qr-code.svg"
        width={288}
        height={288}
        className="size-36"
        imageClassName="size-full object-cover"
      />
      {caption ? (
        <p className="text-center text-xs text-brand-text-muted">{caption}</p>
      ) : null}
    </div>
  )
}
