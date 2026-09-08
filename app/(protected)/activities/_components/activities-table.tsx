import type { GatewayActivityLog } from "@/schemas/gateway-activity/activity-log"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface ActivitiesTableProps {
  logs: GatewayActivityLog[]
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function ActivitiesTable({ logs }: ActivitiesTableProps) {
  if (logs.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-brand-surface px-4 py-8 text-sm text-brand-text-muted">
        No Gateway activity yet. Events appear after Logpush delivers DNS or
        HTTP logs for an enrolled device.
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-brand-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Device</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>DNS/HTTP</TableHead>
            <TableHead>Domain/URL</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Policy</TableHead>
            <TableHead>Application</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-medium">
                {log.deviceName?.trim() || "Device"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-brand-text-muted">
                {formatTime(log.occurredAt)}
              </TableCell>
              <TableCell>
                {log.dataset === "gateway_http" ? "HTTP" : "DNS"}
              </TableCell>
              <TableCell className="max-w-[18rem] truncate">
                {log.url || log.hostname || "—"}
              </TableCell>
              <TableCell>{log.action || "—"}</TableCell>
              <TableCell>{log.policyName || log.policyId || "—"}</TableCell>
              <TableCell>{log.applicationName || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
