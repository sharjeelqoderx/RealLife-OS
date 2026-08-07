import { Skeleton } from "@/components/ui/skeleton"

export default function UnknownProtectedRouteLoading() {
  return (
    <div className="flex min-h-[min(560px,calc(100svh-8rem))] flex-col items-center justify-center gap-4 px-6 py-16">
      <Skeleton className="size-14 rounded-2xl" />
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="mt-4 flex gap-3">
        <Skeleton className="h-10 w-36 rounded-md" />
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>
    </div>
  )
}
