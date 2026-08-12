import { Skeleton } from "@/components/ui/skeleton"

export default function DeviceSetupLoading() {
  return (
    <div className="flex min-h-[calc(100svh-8rem)] flex-col gap-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-12 w-full max-w-2xl" />
      </div>

      <div className="max-w-3xl space-y-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex gap-4">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-6 w-64 max-w-full" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
