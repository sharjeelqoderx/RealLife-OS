import { Skeleton } from "@/components/ui/skeleton"

export default function InstallCertificateLoading() {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-3xl flex-col gap-8">
      <Skeleton className="h-8 w-44" />
      <div className="space-y-4 border-b border-border pb-8 text-center">
        <Skeleton className="mx-auto h-8 w-64" />
        <Skeleton className="mx-auto h-32 w-40 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-80 max-w-full" />
      <Skeleton className="h-16 w-full max-w-2xl" />
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex gap-4">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-6 w-56 max-w-full" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}
