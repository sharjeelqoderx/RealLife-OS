import Link from "next/link"
import { ArrowLeft, Construction } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export interface UnderDevelopmentProps {
  title: string
}

export function UnderDevelopment({ title }: UnderDevelopmentProps) {
  return (
    <div className="flex min-h-[calc(100svh-8rem)] items-center justify-center py-8">
      <Card className="w-full max-w-lg rounded-xl bg-brand-surface ring-0 shadow-none">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <Construction className="size-7" aria-hidden />
          </div>
          <CardTitle className="text-xl font-semibold text-brand-text-heading">
            {title} is under development
          </CardTitle>
          <CardDescription className="text-brand-text-muted">
            We&apos;re building this section. For now, continue from your
            dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <Button
            asChild
            className="h-11 gap-2 px-5 text-sm font-semibold bg-brand-primary text-brand-primary-foreground shadow-md shadow-brand-primary/20 hover:bg-brand-primary/90"
          >
            <Link href="/dashboard">
              <ArrowLeft aria-hidden />
              Back to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
