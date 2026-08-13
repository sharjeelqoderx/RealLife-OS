import {
  DEVICE_SETUP_IMAGES,
  SetupGuideImage,
} from "@/app/(protected)/devices/_components/setup-guide-image"
import { cn } from "@/lib/utils"

export interface IphoneSupervisedSettingsPreviewProps {
  className?: string
}

export function IphoneSupervisedSettingsPreview({
  className,
}: IphoneSupervisedSettingsPreviewProps) {
  return (
    <SetupGuideImage
      src={DEVICE_SETUP_IMAGES.iphoneSettingsSupervised}
      alt="iPhone Settings supervised banner — replace public/devices/iphone-settings-supervised.svg"
      width={360}
      height={420}
      className={cn("mx-auto max-w-xs", className)}
    />
  )
}
