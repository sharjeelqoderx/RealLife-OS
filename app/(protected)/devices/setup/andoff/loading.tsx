import { Skeleton } from "@/components/ui/skeleton"

export default function AndoffGuideLoading() {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
      <div className="min-w-0 flex-1 space-y-8">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-16 w-full max-w-2xl" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-4">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
