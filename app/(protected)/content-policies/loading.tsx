import { PolicyTableLoading } from "@/app/(protected)/content-policies/_components/policy-table-loading"
import { Skeleton } from "@/components/ui/skeleton"

export default function ContentPoliciesLoading() {
  return (
    <div className="flex min-h-[calc(100svh-8rem)] flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56 rounded" />
          <Skeleton className="h-4 w-96 max-w-full rounded" />
        </div>
        <Skeleton className="h-11 w-32 rounded-lg" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Skeleton className="h-11 w-28 rounded-lg" />
          <Skeleton className="h-11 w-24 rounded-lg" />
        </div>
      </div>

      <div className="flex-1">
        <PolicyTableLoading />
      </div>
    </div>
  )
}
