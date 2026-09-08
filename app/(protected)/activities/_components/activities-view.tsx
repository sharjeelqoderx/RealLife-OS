"use client"

import { useInfiniteQuery } from "@tanstack/react-query"

import { ErrorAlert } from "@/components/feedback"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/query/keys"
import type { GatewayActivityListResponse } from "@/schemas/gateway-activity/activity-log"

import { ActivitiesTable } from "./activities-table"

export interface ActivitiesViewProps {
  initialData: GatewayActivityListResponse
}

export function ActivitiesView({ initialData }: ActivitiesViewProps) {
  const listQuery = useInfiniteQuery({
    queryKey: queryKeys.gatewayActivity.all,
    queryFn: ({ pageParam }) => {
      const search = pageParam
        ? `?cursor=${encodeURIComponent(pageParam)}`
        : ""
      return apiClient<GatewayActivityListResponse>(
        `/api/gateway-activity${search}`
      )
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialData: {
      pages: [initialData],
      pageParams: [null],
    },
  })

  const logs = listQuery.data?.pages.flatMap((page) => page.logs) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text-heading">Activity</h1>
        <p className="mt-2 text-sm text-brand-text-muted">
          Gateway DNS and HTTP events for your enrolled devices, newest first.
        </p>
      </div>

      {listQuery.isError ? (
        <ErrorAlert
          message={
            listQuery.error instanceof Error
              ? listQuery.error.message
              : "Failed to load activity"
          }
        />
      ) : null}

      <ActivitiesTable logs={logs} />

      {listQuery.hasNextPage ? (
        <Button
          type="button"
          variant="brandOutline"
          disabled={listQuery.isFetchingNextPage}
          onClick={() => {
            void listQuery.fetchNextPage()
          }}
        >
          Load more
        </Button>
      ) : null}
    </div>
  )
}
