import { Skeleton } from "@/components/ui/skeleton"

export default function UnderDevelopmentLoading() {
  return (
    <div className="flex min-h-[calc(100svh-8rem)] items-center justify-center py-8">
      <div className="w-full max-w-lg space-y-4 rounded-xl bg-brand-surface p-8">
        <Skeleton className="mx-auto size-14 rounded-lg" />
        <Skeleton className="mx-auto h-7 w-64" />
        <Skeleton className="mx-auto h-4 w-full max-w-sm" />
        <Skeleton className="mx-auto h-11 w-44 rounded-lg" />
      </div>
    </div>
  )
}
