import { Skeleton } from "@/components/ui/skeleton"

export function PolicyEditorLoading() {
  return (
    <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border-b border-border/60 lg:border-b-0 lg:border-r lg:border-border/60">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="space-y-0 px-1 py-1">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 px-3 py-3.5"
            >
              <Skeleton className="size-7 rounded-md" />
              <Skeleton className="h-4 flex-1 rounded" />
              <Skeleton className="h-5 w-16 rounded-sm" />
            </div>
          ))}
        </div>
      </aside>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-16 rounded-sm" />
            <Skeleton className="h-6 w-32 rounded" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-5 w-14 rounded" />
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        </div>

        <div className="space-y-8 px-5 py-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index}>
              <div className="mb-3 flex items-center justify-between">
                <Skeleton className="h-5 w-36 rounded" />
                <Skeleton className="h-8 w-32 rounded-md" />
              </div>
              <Skeleton className="h-36 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
