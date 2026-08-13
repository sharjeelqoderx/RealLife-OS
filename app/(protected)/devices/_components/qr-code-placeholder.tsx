import { cn } from "@/lib/utils"

export interface QrCodePlaceholderProps {
  value?: string
  caption?: string
  className?: string
  size?: number
}

export function QrCodePlaceholder({
  value,
  caption,
  className,
  size = 160,
}: QrCodePlaceholderProps) {
  const qrSrc = value
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`
    : undefined

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {qrSrc ? (
        <div
          style={{ width: size, maxWidth: "100%", aspectRatio: "1 / 1" }}
          className="relative overflow-hidden rounded-xl border border-border bg-white p-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt={`QR code for ${value}`}
            width={size}
            height={size}
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <div
          style={{ width: size, maxWidth: "100%", aspectRatio: "1 / 1" }}
          className="relative overflow-hidden rounded-xl border border-border bg-white p-2"
        >
          <div className="flex h-full w-full items-center justify-center text-xs text-brand-text-muted">
            QR Code
          </div>
        </div>
      )}
      {caption ? (
        <p className="text-center text-xs text-brand-text-muted">{caption}</p>
      ) : null}
    </div>
  )
}
