import { ActivitiesView } from "@/app/(protected)/activities/_components/activities-view"
import { listGatewayActivityLogs } from "@/lib/services/gateway-activity/list-activity-logs"

export default async function ActivitiesPage() {
  const initialData = await listGatewayActivityLogs().catch(() => ({
    logs: [],
    nextCursor: null,
  }))

  return <ActivitiesView initialData={initialData} />
}
