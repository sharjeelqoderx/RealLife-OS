import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function PolicyTableLoading() {
  return (
    <>
      <div className="grid gap-4 lg:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card
            key={index}
            className="rounded-xl bg-brand-surface ring-0 shadow-none"
          >
            <CardContent className="space-y-3 pt-6">
              <Skeleton className="h-5 w-48 rounded" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden gap-0 overflow-hidden rounded-xl bg-brand-surface py-0 ring-0 shadow-none lg:block">
        <div className="flex items-center gap-4 border-b border-border/60 bg-muted/40 px-4 py-2">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="ms-auto size-7 rounded-md" />
        </div>
        <CardContent className="p-0">
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-4 border-b border-border/40 px-4 py-2.5 last:border-b-0"
              >
                <Skeleton className="h-5 w-48 rounded" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-12 rounded" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="ms-auto size-7 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
