import { Skeleton } from "@/components/ui/skeleton"

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 pt-16 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-64 rounded-full" />
        <Skeleton className="mt-8 h-14 w-full max-w-2xl" />
        <Skeleton className="mt-4 h-14 w-full max-w-xl" />
        <Skeleton className="mt-6 h-20 w-full max-w-2xl" />
        <div className="mt-8 flex gap-4">
          <Skeleton className="h-12 w-44 rounded-lg" />
          <Skeleton className="h-12 w-36 rounded-lg" />
        </div>
        <Skeleton className="mt-12 h-64 w-full max-w-5xl rounded-2xl" />
      </div>
    </div>
  )
}
