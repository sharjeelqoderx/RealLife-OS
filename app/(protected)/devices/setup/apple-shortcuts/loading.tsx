import { Skeleton } from "@/components/ui/skeleton"

export default function AppleShortcutsLoading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-10 w-80 max-w-full" />
      <Skeleton className="h-16 w-full max-w-2xl" />
      <Skeleton className="h-48 rounded-xl" />
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-24 rounded-xl" />
      ))}
    </div>
  )
}
