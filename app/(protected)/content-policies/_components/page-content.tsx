"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import { PoliciesMultiSelectFilter } from "@/app/(protected)/content-policies/_components/policies-multi-select-filter"
import { PoliciesSearchInput } from "@/app/(protected)/content-policies/_components/policies-search-input"
import { PolicyTable } from "@/app/(protected)/content-policies/_components/policy-table"
import { PolicyTableLoading } from "@/app/(protected)/content-policies/_components/policy-table-loading"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import {
  POLICY_STATUS_OPTIONS,
  POLICY_TYPE_OPTIONS,
  buildGatewayPoliciesListPath,
  normalizePolicyListFilters,
  readPolicyListParams,
  serializePolicyListParam,
  updatePolicyListUrlParam,
  type PolicyListQueryFilters,
} from "@/lib/content-policies/list-params"
import { queryKeys } from "@/lib/query/keys"
import type {
  PolicyListItem,
  PolicyStatus,
  PolicyType,
} from "@/schemas/content-policies/policy"

type FilterControl = "search" | "status" | "type"

export interface PoliciesPageProps {
  initialPolicies: PolicyListItem[]
  searchQuery: string
  statusFilters: PolicyStatus[]
  typeFilters: PolicyType[]
}

export function PoliciesPage({
  initialPolicies,
  searchQuery,
  statusFilters: initialStatusFilters,
  typeFilters: initialTypeFilters,
}: PoliciesPageProps) {
  const [query, setQuery] = useState(searchQuery)
  const [externalSearchQuery, setExternalSearchQuery] = useState(searchQuery)
  const [statusFilters, setStatusFilters] =
    useState<PolicyStatus[]>(initialStatusFilters)
  const [typeFilters, setTypeFilters] = useState<PolicyType[]>(initialTypeFilters)
  const [loadingControl, setLoadingControl] = useState<FilterControl | null>(
    null
  )

  const listFilters = useMemo(
    () =>
      normalizePolicyListFilters({
        q: query,
        status: statusFilters,
        type: typeFilters,
      }),
    [query, statusFilters, typeFilters]
  )

  const initialListFilters = useMemo(
    () =>
      normalizePolicyListFilters({
        q: searchQuery,
        status: initialStatusFilters,
        type: initialTypeFilters,
      }),
    [searchQuery, initialStatusFilters, initialTypeFilters]
  )

  const matchesInitialFilters = useMemo(
    () => arePolicyListFiltersEqual(listFilters, initialListFilters),
    [listFilters, initialListFilters]
  )

  const policiesQuery = useQuery({
    queryKey: queryKeys.gatewayPolicies.list(listFilters),
    queryFn: () =>
      apiClient<PolicyListItem[]>(buildGatewayPoliciesListPath(listFilters)),
    initialData: matchesInitialFilters ? initialPolicies : undefined,
    placeholderData: keepPreviousData,
  })

  const handleQueryChange = useCallback((nextQuery: string) => {
    setLoadingControl("search")
    setQuery(nextQuery)
  }, [])

  const handleStatusChange = useCallback((nextStatuses: PolicyStatus[]) => {
    setLoadingControl("status")
    setStatusFilters(nextStatuses)
    updatePolicyListUrlParam(
      "status",
      serializePolicyListParam(nextStatuses)
    )
  }, [])

  const handleTypeChange = useCallback((nextTypes: PolicyType[]) => {
    setLoadingControl("type")
    setTypeFilters(nextTypes)
    updatePolicyListUrlParam("type", serializePolicyListParam(nextTypes))
  }, [])

  useEffect(() => {
    function handlePopState() {
      const params = readPolicyListParams()
      setLoadingControl("search")
      setExternalSearchQuery(params.q)
      setQuery(params.q)
      setStatusFilters(params.status)
      setTypeFilters(params.type)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    if (!loadingControl) return
    if (policiesQuery.isFetching) return
    setLoadingControl(null)
  }, [loadingControl, policiesQuery.isFetching, policiesQuery.dataUpdatedAt])

  const policies = policiesQuery.data ?? []
  const resultCount = policies.length
  const showSearchSpinner =
    loadingControl === "search" && policiesQuery.isFetching
  const showStatusSpinner =
    loadingControl === "status" && policiesQuery.isFetching
  const showTypeSpinner = loadingControl === "type" && policiesQuery.isFetching

  return (
    <div className="flex min-h-[calc(100svh-8rem)] flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-brand-text-heading md:text-3xl">
            Content Policies
          </h1>
          <p className="text-sm text-brand-text-muted">
            Manage Cloudflare Access allow, block, and bypass policies for your
            application.
          </p>
        </div>
        <Button size="lg" className="shrink-0" asChild>
          <Link href="/content-policies/new-policy">
            <Plus />
            Add Rule
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PoliciesSearchInput
          searchQuery={externalSearchQuery}
          onQueryChange={handleQueryChange}
          isLoading={showSearchSpinner}
        />

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <PoliciesMultiSelectFilter
            label="Status"
            options={POLICY_STATUS_OPTIONS}
            selected={statusFilters}
            count={resultCount}
            onChange={handleStatusChange}
            isLoading={showStatusSpinner}
          />
          <PoliciesMultiSelectFilter
            label="Type"
            options={POLICY_TYPE_OPTIONS}
            selected={typeFilters}
            count={resultCount}
            onChange={handleTypeChange}
            isLoading={showTypeSpinner}
          />
        </div>
      </div>

      <div className="flex-1">
        {policiesQuery.isLoading && !policiesQuery.data ? (
          <PolicyTableLoading />
        ) : policiesQuery.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {policiesQuery.error instanceof Error
              ? policiesQuery.error.message
              : "Failed to load policies"}
          </p>
        ) : (
          <PolicyTable policies={policies} />
        )}
      </div>
    </div>
  )
}

function arePolicyListFiltersEqual(
  left: PolicyListQueryFilters,
  right: PolicyListQueryFilters
) {
  return (
    left.q === right.q &&
    serializePolicyListParam(left.status) ===
      serializePolicyListParam(right.status) &&
    serializePolicyListParam(left.type) === serializePolicyListParam(right.type)
  )
}
