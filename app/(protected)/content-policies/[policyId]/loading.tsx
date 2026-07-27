import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function PolicyDetailLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-28 rounded" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <Skeleton className="h-9 w-52 rounded" />
        <Skeleton className="h-11 w-32 rounded-lg" />
      </div>

      <div className="grid gap-0 rounded-xl border border-border/60 bg-white lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="border-b border-border/60 lg:border-b-0 lg:border-r">
          <div className="space-y-2 px-4 py-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-md px-2 py-3"
              >
                <Skeleton className="size-7 rounded-md" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-5 w-16 rounded-sm" />
              </div>
            ))}
          </div>
        </div>

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
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i}>
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
    </div>
  )
}
