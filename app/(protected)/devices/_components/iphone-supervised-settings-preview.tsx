import { cn } from "@/lib/utils"

export interface IphoneSupervisedSettingsPreviewProps {
  className?: string
}

export function IphoneSupervisedSettingsPreview({
  className,
}: IphoneSupervisedSettingsPreviewProps) {
  return (
    <div
      className={cn(
        "mx-auto max-w-sm overflow-hidden rounded-2xl border border-border bg-white shadow-sm",
        className
      )}
    >
      <div className="border-b border-border px-4 py-3">
        <p className="text-center text-lg font-semibold text-brand-text-heading">
          Settings
        </p>
        <div className="mx-auto mt-3 flex max-w-[220px] items-center gap-2 rounded-lg bg-brand-input px-3 py-2">
          <span className="text-xs text-brand-text-muted">Search</span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="rounded-lg bg-brand-primary/5 px-3 py-2.5 text-center">
          <p className="text-[11px] leading-relaxed text-brand-text-muted">
            This iPhone is supervised and managed by RealLife OS.{" "}
            <span className="text-brand-link">Learn more about device supervision...</span>
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-bold text-brand-primary">
            JS
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-text-heading">John Smith</p>
            <p className="text-xs text-brand-text-muted">
              Apple ID, iCloud+, Media &amp; Purchases
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
