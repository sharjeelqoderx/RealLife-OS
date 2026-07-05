import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function LoginLoading() {
  return (
    <Card className="overflow-hidden border border-brand-input-border border-t-4 border-t-brand-primary bg-brand-surface shadow-[0_8px_30px_var(--brand-shadow)]">
      <CardContent className="flex flex-col gap-6 px-8 pt-8">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex flex-col gap-5">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-center border-t-0 bg-transparent p-0 px-8 pb-5">
        <div className="w-full border-t border-brand-input-border" />
        <Skeleton className="mt-5 h-4 w-44" />
      </CardFooter>
    </Card>
  )
}
