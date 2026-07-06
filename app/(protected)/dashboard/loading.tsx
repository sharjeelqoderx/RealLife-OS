import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-background px-6 py-10">
      <main className="mx-auto w-full max-w-4xl space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </main>
    </div>
  )
}
