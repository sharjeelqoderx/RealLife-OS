import { PhonePreview } from "@/app/(protected)/devices/_components/phone-preview"
import { cn } from "@/lib/utils"
import type { DevicePlatform } from "@/schemas/devices/device"

export interface CloudflareOneAppHeaderProps {
  platform?: DevicePlatform
  className?: string
}

export function CloudflareOneAppHeader({
  platform = "android",
  className,
}: CloudflareOneAppHeaderProps) {
  return (
    <div className={cn("border-b border-border pb-8 text-center", className)}>
      <h2 className="text-xl font-bold text-brand-text-heading md:text-2xl">
        Cloudflare One App
      </h2>
      <div className="mx-auto mt-6 max-w-[200px]">
        <PhonePreview platform={platform} />
      </div>
    </div>
  )
}
