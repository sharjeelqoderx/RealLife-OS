"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
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
  readPolicyListParams,
  serializePolicyListParam,
  updatePolicyListUrlParam,
} from "@/lib/content-policies/list-params"
import { queryKeys } from "@/lib/query/keys"
import { filterPolicies } from "@/lib/services/content-policies/get-policies"
import type {
  PolicyListItem,
  PolicyStatus,
  PolicyType,
} from "@/schemas/content-policies/policy"

export interface PoliciesPageProps {
  allPolicies: PolicyListItem[]
  searchQuery: string
  statusFilters: PolicyStatus[]
  typeFilters: PolicyType[]
}

export function PoliciesPage({
  allPolicies,
  searchQuery,
  statusFilters: initialStatusFilters,
  typeFilters: initialTypeFilters,
}: PoliciesPageProps) {
  const [query, setQuery] = useState(searchQuery)
  const [statusFilters, setStatusFilters] =
    useState<PolicyStatus[]>(initialStatusFilters)
  const [typeFilters, setTypeFilters] = useState<PolicyType[]>(initialTypeFilters)

  const policiesQuery = useQuery({
    queryKey: queryKeys.gatewayPolicies.list(),
    queryFn: () => apiClient<PolicyListItem[]>("/api/gateway-policies"),
    initialData: allPolicies.length > 0 ? allPolicies : undefined,
  })

  const handleQueryChange = useCallback((nextQuery: string) => {
    setQuery(nextQuery)
  }, [])

  const handleStatusChange = useCallback((nextStatuses: PolicyStatus[]) => {
    setStatusFilters(nextStatuses)
    updatePolicyListUrlParam(
      "status",
      serializePolicyListParam(nextStatuses)
    )
  }, [])

  const handleTypeChange = useCallback((nextTypes: PolicyType[]) => {
    setTypeFilters(nextTypes)
    updatePolicyListUrlParam("type", serializePolicyListParam(nextTypes))
  }, [])

  useEffect(() => {
    function handlePopState() {
      const params = readPolicyListParams()
      setQuery(params.q)
      setStatusFilters(params.status as PolicyStatus[])
      setTypeFilters(params.type as PolicyType[])
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const sourcePolicies = policiesQuery.data ?? []

  const policies = useMemo(
    () =>
      filterPolicies(sourcePolicies, {
        query,
        statuses: statusFilters,
        types: typeFilters,
      }),
    [sourcePolicies, query, statusFilters, typeFilters]
  )

  const statusFilterCount = useMemo(() => {
    const basePolicies = filterPolicies(sourcePolicies, {
      query,
      types: typeFilters,
    })

    if (statusFilters.length === 0) {
      return basePolicies.length
    }

    return basePolicies.filter((policy) =>
      statusFilters.includes(policy.status)
    ).length
  }, [sourcePolicies, query, statusFilters, typeFilters])

  const typeFilterCount = useMemo(() => {
    const basePolicies = filterPolicies(sourcePolicies, {
      query,
      statuses: statusFilters,
    })

    if (typeFilters.length === 0) {
      return basePolicies.length
    }

    return basePolicies.filter((policy) => typeFilters.includes(policy.type))
      .length
  }, [sourcePolicies, query, statusFilters, typeFilters])

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
          searchQuery={searchQuery}
          onQueryChange={handleQueryChange}
        />

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <PoliciesMultiSelectFilter
            label="Status"
            options={POLICY_STATUS_OPTIONS}
            selected={statusFilters}
            count={statusFilterCount}
            onChange={handleStatusChange}
          />
          <PoliciesMultiSelectFilter
            label="Type"
            options={POLICY_TYPE_OPTIONS}
            selected={typeFilters}
            count={typeFilterCount}
            onChange={handleTypeChange}
          />
        </div>
      </div>

      <div className="flex-1">
        {policiesQuery.isLoading ? (
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
