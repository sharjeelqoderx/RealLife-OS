import { cn } from "@/lib/utils"

export interface QrCodePlaceholderProps {
  caption?: string
  className?: string
}

export function QrCodePlaceholder({ caption, className }: QrCodePlaceholderProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div
        aria-hidden
        className="grid size-36 grid-cols-8 grid-rows-8 gap-0.5 rounded-lg border border-border bg-white p-2"
      >
        {Array.from({ length: 64 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "rounded-[1px]",
              (index + Math.floor(index / 8)) % 3 === 0
                ? "bg-brand-text-heading"
                : "bg-transparent"
            )}
          />
        ))}
      </div>
      {caption ? (
        <p className="text-center text-xs text-brand-text-muted">{caption}</p>
      ) : null}
    </div>
  )
}
