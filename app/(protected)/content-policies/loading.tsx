import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ContentPoliciesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56 rounded" />
          <Skeleton className="h-4 w-96 rounded" />
        </div>
        <Skeleton className="h-11 w-32 rounded-lg" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      <Card className="rounded-xl bg-brand-surface ring-0 shadow-none">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <Skeleton className="h-5 w-48 rounded" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-12 rounded" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-24 rounded ml-auto" />
                <Skeleton className="h-7 w-16 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
