import { cn } from "@/lib/utils"
import type { DevicePlatform } from "@/schemas/devices/device"

export interface PhonePreviewProps {
  platform: DevicePlatform
  className?: string
}

export function PhonePreview({ platform, className }: PhonePreviewProps) {
  const isAndroid = platform === "android"

  return (
    <div
      className={cn(
        "relative mx-auto flex h-28 w-full max-w-[140px] flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-[#f8fafc] shadow-sm",
        className
      )}
    >
      <div className="flex h-7 shrink-0 items-center justify-center bg-white">
        {isAndroid ? (
          <div className="size-2.5 rounded-full bg-[#1e293b]" />
        ) : (
          <div className="h-4 w-16 rounded-b-xl bg-[#1e293b]" />
        )}
      </div>
      <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-[#eef2ff] to-[#f8fafc] px-3">
        <div className="h-10 w-full rounded-lg bg-white/80 ring-1 ring-border/60" />
      </div>
    </div>
  )
}
