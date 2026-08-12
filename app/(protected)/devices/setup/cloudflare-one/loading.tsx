import { Skeleton } from "@/components/ui/skeleton"

export default function CloudflareOneWizardLoading() {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-3xl flex-col gap-8">
      <Skeleton className="h-8 w-44" />
      <div className="space-y-4 border-b border-border pb-8 text-center">
        <Skeleton className="mx-auto h-8 w-56" />
        <Skeleton className="mx-auto h-32 w-40 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-72 max-w-full" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <div className="mt-auto flex items-center justify-between gap-4 pt-8">
        <Skeleton className="h-2 w-full max-w-xs" />
        <Skeleton className="h-11 w-28 rounded-lg" />
      </div>
    </div>
  )
}
