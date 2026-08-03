import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  policyTableCardClassName,
  policyTableCellClassName,
  policyTableClassName,
  policyTableColgroup,
  policyTableHeadClassName,
} from "@/app/(protected)/content-policies/_components/policy-table-layout"
import { cn } from "@/lib/utils"

function PolicyTableColgroup() {
  return (
    <colgroup>
      {policyTableColgroup.map((col) => (
        <col key={col.key} style={{ width: col.width }} />
      ))}
    </colgroup>
  )
}

function MobilePolicyCardSkeleton() {
  return (
    <Card className={cn(policyTableCardClassName, "gap-0 py-0")}>
      <CardHeader className="rounded-none border-b border-border/60 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-5 w-[70%] max-w-[12rem] rounded" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-[4.5rem] rounded" />
              <Skeleton className="h-5 w-14 rounded" />
            </div>
          </div>
          <Skeleton className="size-7 shrink-0 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-16 rounded" />
          <Skeleton className="h-3.5 w-24 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

function DesktopPolicyRowSkeleton() {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        className={cn(policyTableCellClassName, "font-medium")}
      >
        <Skeleton className="h-4 w-[85%] rounded" />
      </TableCell>
      <TableCell className={policyTableCellClassName}>
        <Skeleton className="h-5 w-[4.5rem] rounded" />
      </TableCell>
      <TableCell className={policyTableCellClassName}>
        <Skeleton className="h-4 w-6 rounded" />
      </TableCell>
      <TableCell className={policyTableCellClassName}>
        <Skeleton className="h-5 w-14 rounded" />
      </TableCell>
      <TableCell className={policyTableCellClassName}>
        <Skeleton className="h-4 w-[70%] rounded" />
      </TableCell>
      <TableCell className={cn(policyTableCellClassName, "text-right")}>
        <div className="flex justify-end">
          <Skeleton className="size-7 rounded-md" />
        </div>
      </TableCell>
    </TableRow>
  )
}

export function PolicyTableLoading() {
  return (
    <>
      <div className="grid gap-4 lg:hidden">
        <MobilePolicyCardSkeleton />
        <MobilePolicyCardSkeleton />
      </div>

      <Card
        className={cn(
          policyTableCardClassName,
          "hidden gap-0 overflow-hidden py-0 lg:block"
        )}
      >
        <CardContent className="p-0">
          <Table className={policyTableClassName}>
            <PolicyTableColgroup />
            <TableHeader className="[&_tr]:border-0">
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead className={policyTableHeadClassName}>
                  Policy Name
                </TableHead>
                <TableHead className={policyTableHeadClassName}>Type</TableHead>
                <TableHead className={policyTableHeadClassName}>Rules</TableHead>
                <TableHead className={policyTableHeadClassName}>Status</TableHead>
                <TableHead className={policyTableHeadClassName}>
                  Last Updated
                </TableHead>
                <TableHead
                  className={cn(policyTableHeadClassName, "text-right")}
                >
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <DesktopPolicyRowSkeleton />
              <DesktopPolicyRowSkeleton />
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
