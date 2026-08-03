import { Skeleton } from "@/components/ui/skeleton"

/** Loading skeleton for read-only policy view (`/content-policies/[policyId]`). */
export function PolicyViewLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Skeleton className="size-8 shrink-0 rounded-md" />
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="size-10 rounded-md" />
              <Skeleton className="h-9 w-64 max-w-full rounded" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
          </div>
        </div>
        <Skeleton className="h-11 w-36 shrink-0 rounded-lg" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border/70 bg-brand-surface p-5">
          <Skeleton className="h-4 w-24 rounded" />
          <div className="my-3 h-px bg-border/60" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between gap-4">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border/70 bg-brand-surface p-5">
          <Skeleton className="h-4 w-28 rounded" />
          <div className="my-3 h-px bg-border/60" />
          <div className="space-y-3">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-36 rounded" />
            </div>
            <div className="flex justify-between gap-4">
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-36 rounded" />
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-border/70 bg-brand-surface p-5">
        <Skeleton className="h-4 w-28 rounded" />
        <div className="my-3 h-px bg-border/60" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
        </div>
      </section>

      <section className="rounded-lg border border-border/70 bg-brand-surface p-5">
        <Skeleton className="h-4 w-40 rounded" />
        <div className="my-3 h-px bg-border/60" />
        <Skeleton className="h-24 w-full rounded-md" />
      </section>

      <section className="rounded-lg border border-border/70 bg-brand-surface p-5">
        <Skeleton className="h-4 w-24 rounded" />
        <div className="my-3 h-px bg-border/60" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </section>
    </div>
  )
}
