"use client"

import Link from "next/link"

import { PhonePreview } from "@/app/(protected)/devices/_components/phone-preview"
import { cn } from "@/lib/utils"
import {
  devicePlatformSchema,
  getPlatformLabel,
  type DevicePlatform,
} from "@/schemas/devices/device"

export interface DeviceTypePickerProps {
  selectedPlatform: DevicePlatform | null
  onSelect?: (platform: DevicePlatform) => void
  setupHref?: string
  className?: string
}

const platforms = devicePlatformSchema.options

export function DeviceTypePicker({
  selectedPlatform,
  onSelect,
  setupHref,
  className,
}: DeviceTypePickerProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {platforms.map((platform) => {
        const isSelected = selectedPlatform === platform
        const label = getPlatformLabel(platform)

        const card = (
          <div
            className={cn(
              "flex flex-col overflow-hidden rounded-xl border transition-colors",
              isSelected
                ? "border-brand-primary bg-brand-primary/5"
                : "border-border bg-white hover:border-brand-primary/40"
            )}
          >
            <div
              className={cn(
                "border-b px-4 py-3",
                isSelected ? "border-brand-primary/20" : "border-border"
              )}
            >
              <p className="text-sm font-semibold text-brand-text-heading">{label}</p>
            </div>
            <div className="flex flex-1 items-end justify-center px-4 pt-4 pb-0">
              <PhonePreview platform={platform} />
            </div>
          </div>
        )

        if (onSelect) {
          return (
            <button
              key={platform}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(platform)}
              className="text-left"
            >
              {card}
            </button>
          )
        }

        const href = setupHref ?? `/devices/setup?platform=${platform}`

        return (
          <Link
            key={platform}
            href={href}
            aria-current={isSelected ? "page" : undefined}
            className="block"
          >
            {card}
          </Link>
        )
      })}
    </div>
  )
}
