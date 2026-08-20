"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users2,
  X,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { CustomSpinner } from "@/components/feedback/custom-spinner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/query/keys"
import type { GatewayPolicyEditorData } from "@/lib/services/content-policies/gateway-policies"
import { cn } from "@/lib/utils"
import {
  createGatewayPolicySchema,
  type CreateGatewayPolicyInput,
} from "@/schemas/content-policies/gateway-policy"
import type {
  GatewayPreset,
  GatewayPresetsResponse,
} from "@/schemas/content-policies/gateway-preset"
import type { PolicyListItem } from "@/schemas/content-policies/policy"
import {
  PickerDialog,
  type PickerGroup,
} from "./picker-dialog"
import {
  ScheduleSheet,
  type ScheduleBlock,
} from "./schedule-sheet"

type PolicyType = "allow" | "block" | "ytrestricted" | "safesearch"

type RuleItem = {
  id: string
  name: string
  type: PolicyType
  typeLabel: string
  badgeClass: string
}

const typeBadgeDefaults: Record<
  PolicyType,
  { label: string; className: string }
> = {
  allow: {
    label: "ALLOW",
    className: "bg-green-700 text-white hover:bg-green-700",
  },
  block: {
    label: "BLOCK",
    className: "bg-red-600 text-white hover:bg-red-600",
  },
  ytrestricted: {
    label: "YT RESTRICTED",
    className: "bg-gray-800 text-white hover:bg-gray-800",
  },
  safesearch: {
    label: "SAFESEARCH",
    className: "bg-blue-800 text-white hover:bg-blue-800",
  },
}

const mockRules: RuleItem[] = [
  {
    id: "rule-1",
    name: "Whitelist",
    type: "allow",
    typeLabel: typeBadgeDefaults.allow.label,
    badgeClass: typeBadgeDefaults.allow.className,
  },
  {
    id: "rule-2",
    name: "Whitelist",
    type: "allow",
    typeLabel: typeBadgeDefaults.allow.label,
    badgeClass: typeBadgeDefaults.allow.className,
  },
  {
    id: "rule-3",
    name: "Blacklist",
    type: "block",
    typeLabel: typeBadgeDefaults.block.label,
    badgeClass: typeBadgeDefaults.block.className,
  },
  {
    id: "rule-4",
    name: "YouTube Restricted",
    type: "ytrestricted",
    typeLabel: typeBadgeDefaults.ytrestricted.label,
    badgeClass: typeBadgeDefaults.ytrestricted.className,
  },
  {
    id: "rule-5",
    name: "Blacklist",
    type: "block",
    typeLabel: typeBadgeDefaults.block.label,
    badgeClass: typeBadgeDefaults.block.className,
  },
  {
    id: "rule-6",
    name: "Blacklist",
    type: "block",
    typeLabel: typeBadgeDefaults.block.label,
    badgeClass: typeBadgeDefaults.block.className,
  },
  {
    id: "rule-7",
    name: "SafeSearch on Supported Search Engines",
    type: "safesearch",
    typeLabel: typeBadgeDefaults.safesearch.label,
    badgeClass: typeBadgeDefaults.safesearch.className,
  },
]

type CreateRuleTab = "general" | "presets"

type GeneralRuleOption = {
  type: PolicyType
  title: string
  description: string
}

const generalRuleOptions: GeneralRuleOption[] = [
  {
    type: "block",
    title: "Block",
    description: "Block access to categories, apps, and domains.",
  },
  {
    type: "allow",
    title: "Allow",
    description: "Whitelist something that is blocked in another rule.",
  },
  {
    type: "ytrestricted",
    title: "YouTube Restricted",
    description:
      "Enforces restricted mode on YouTube to filter out mature content.",
  },
  {
    type: "safesearch",
    title: "SafeSearch",
    description:
      "Enforces SafeSearch if supported by a search engine.",
  },
]

const presetBadgeClass: Record<PolicyType, string> = {
  allow: "bg-green-700 text-white hover:bg-green-700",
  block: "bg-red-600 text-white hover:bg-red-600",
  ytrestricted: "bg-gray-800 text-white hover:bg-gray-800",
  safesearch: "bg-blue-800 text-white hover:bg-blue-800",
}


const headerBadgeByType: Record<PolicyType, { text: string; class: string }> = {
  allow: { text: "ALLOW", class: "bg-green-700 text-white hover:bg-green-700" },
  block: { text: "BLOCK", class: "bg-red-600 text-white hover:bg-red-600" },
  ytrestricted: {
    text: "YTRES",
    class: "bg-gray-800 text-white hover:bg-gray-800",
  },
  safesearch: {
    text: "SAFE",
    class: "bg-blue-800 text-white hover:bg-blue-800",
  },
}

function formatPolicyTypeLabel(type: PolicyType): string {
  if (type === "ytrestricted") return "YouTube Restricted"
  if (type === "safesearch") return "SafeSearch"
  if (type === "allow") return "Allow"
  return "Block"
}

type CreatedGatewayRule = {
  id?: string
  name?: string
  action?: string
  enabled?: boolean
  created_at?: string
  updated_at?: string
}

function toPolicyListItem(
  rule: CreatedGatewayRule,
  payload: CreateGatewayPolicyInput
): PolicyListItem | null {
  const id = rule.id?.trim()
  if (!id) return null

  const updatedAt = rule.updated_at ?? rule.created_at
  return {
    id,
    name: rule.name?.trim() || payload.name,
    type: payload.type,
    typeLabel: formatPolicyTypeLabel(payload.type),
    rulesCount: 1,
    status:
      rule.enabled === false || payload.enabled === false
        ? "inactive"
        : "active",
    updatedAt: updatedAt
      ? new Date(updatedAt).toLocaleDateString()
      : new Date().toLocaleDateString(),
  }
}

type AddAddressMode = "auto" | "address" | "keyword"

type WebAddressItem = {
  id: string
  url: string
  mode: AddAddressMode
}

function addressTag(mode: AddAddressMode): string {
  if (mode === "keyword") return "KEYWORD"
  if (mode === "address") return "ADDRESS"
  return "AUTO"
}

const HOSTNAME_PATTERN =
  /^(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i

function normalizeAddressPart(part: string): string {
  return part
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
}

const addressTabMeta: Record<
  AddAddressMode,
  { label: string; placeholder: string; hint: string }
> = {
  auto: {
    label: "Auto-Detect",
    placeholder: "e.g. facebook.com, messenger.facebook.com",
    hint: "Matches the domain and all its subdomains (Cloudflare Domain selector).",
  },
  address: {
    label: "Address",
    placeholder: "e.g. www.facebook.com",
    hint: "Matches only the exact hostname (Cloudflare Host selector).",
  },
  keyword: {
    label: "Keyword",
    placeholder: "e.g. facebook, messenger, ads",
    hint: "Matches hostnames that contain the keyword (regex substring).",
  },
}

type PickerGroupsResponse = {
  groups: PickerGroup<string>[]
}

type PickedItem = {
  id: string
  label: string
  groupLabel: string
}

type PolicyEditorMode = "create" | "edit"

type Props = {
  mode: PolicyEditorMode
  policyId?: string
  /** Prepopulated Gateway rule for edit mode (same form as create). */
  initialData?: GatewayPolicyEditorData
}

function buildRuleItemFromEditorData(data: GatewayPolicyEditorData): RuleItem {
  const defaults = typeBadgeDefaults[data.type]
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    typeLabel: defaults.label,
    badgeClass: defaults.className,
  }
}

type EditorSnapshot = {
  name: string
  type: PolicyType
  enabled: boolean
  categoryIds: string[]
  appIds: string[]
  locationIds: string[]
  addresses: { url: string; mode: AddAddressMode }[]
  schedules: {
    dayIndex: number
    startHour: number
    startMinute: number
    durationMinutes: number
  }[]
}

function serializeEditorSnapshot(snapshot: EditorSnapshot): string {
  return JSON.stringify({
    name: snapshot.name,
    type: snapshot.type,
    enabled: snapshot.enabled,
    categoryIds: [...snapshot.categoryIds].sort(),
    appIds: [...snapshot.appIds].sort(),
    locationIds: [...snapshot.locationIds].sort(),
    addresses: [...snapshot.addresses]
      .map((a) => ({ url: a.url, mode: a.mode }))
      .sort((a, b) =>
        `${a.mode}:${a.url}`.localeCompare(`${b.mode}:${b.url}`)
      ),
    schedules: [...snapshot.schedules]
      .map((s) => ({
        dayIndex: s.dayIndex,
        startHour: s.startHour,
        startMinute: s.startMinute,
        durationMinutes: s.durationMinutes,
      }))
      .sort((a, b) =>
        `${a.dayIndex}-${a.startHour}-${a.startMinute}-${a.durationMinutes}`.localeCompare(
          `${b.dayIndex}-${b.startHour}-${b.startMinute}-${b.durationMinutes}`
        )
      ),
  })
}

function snapshotFromEditorData(data: GatewayPolicyEditorData): string {
  return serializeEditorSnapshot({
    name: data.name,
    type: data.type,
    enabled: data.enabled,
    categoryIds: data.categories.map((c) => c.id),
    appIds: data.apps.map((a) => a.id),
    locationIds: data.locations.map((l) => l.id),
    addresses: data.addresses,
    schedules: data.schedules,
  })
}

export function PolicyDetail({ mode, policyId, initialData }: Props) {
  const isCreateMode = mode === "create"
  const isEditMode = mode === "edit"
  const router = useRouter()
  const queryClient = useQueryClient()
  const idCounterRef = useRef(100)
  const nextId = (prefix: string) => {
    idCounterRef.current += 1
    const c = idCounterRef.current
    return `${prefix}-${c}-${(c * 7919) % 100000}`
  }

  const initialRule = initialData
    ? buildRuleItemFromEditorData(initialData)
    : null

  const [rulesList, setRulesList] = useState<RuleItem[]>(() => {
    if (isCreateMode) return []
    if (initialRule) return [initialRule]
    return mockRules
  })
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(() => {
    if (isCreateMode) return null
    if (initialRule) return initialRule.id
    return mockRules[0]?.id ?? null
  })
  const [isActive, setIsActive] = useState(() =>
    initialData ? initialData.enabled : true
  )
  const [addressesByRule, setAddressesByRule] = useState<
    Record<string, WebAddressItem[]>
  >(() => {
    if (!initialData || !initialRule) return {}
    return {
      [initialRule.id]: initialData.addresses.map((a, index) => ({
        id: `wa-init-${index}`,
        url: a.url,
        mode: a.mode,
      })),
    }
  })

  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false)
  const [addressInput, setAddressInput] = useState("")
  const [addressError, setAddressError] = useState("")
  const [addressMode, setAddressMode] =
    useState<AddAddressMode>("auto")
  const [pendingAddresses, setPendingAddresses] = useState<
    { id: string; url: string; mode: AddAddressMode; selected: boolean }[]
  >([])

  const baselineSnapshotRef = useRef<string | null>(
    initialData ? snapshotFromEditorData(initialData) : null
  )

  /** Keep form state in sync with server-fetched Gateway rule (exact data). */
  useEffect(() => {
    if (!isEditMode || !initialData) return

    const rule = buildRuleItemFromEditorData(initialData)
    setRulesList([rule])
    setSelectedRuleId(rule.id)
    setIsActive(initialData.enabled)
    setCategoriesByRule({ [rule.id]: initialData.categories })
    setAppsByRule({ [rule.id]: initialData.apps })
    setAudienceByRule({ [rule.id]: initialData.locations })
    setAddressesByRule({
      [rule.id]: initialData.addresses.map((a, index) => ({
        id: `wa-init-${index}`,
        url: a.url,
        mode: a.mode,
      })),
    })
    setSchedulesByRule({
      [rule.id]: initialData.schedules.map((s, index) => ({
        id: `sch-init-${index}`,
        dayIndex: s.dayIndex,
        startHour: s.startHour,
        startMinute: s.startMinute,
        durationMinutes: s.durationMinutes,
        saved: true,
      })),
    })
    baselineSnapshotRef.current = snapshotFromEditorData(initialData)
    // Only re-hydrate when the policy id changes (not on every parent render).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [isEditMode, initialData?.id])

  const saveMutation = useMutation({
    mutationFn: async (payload: CreateGatewayPolicyInput) => {
      if (isEditMode) {
        const id = policyId ?? initialData?.id
        if (!id) throw new Error("Policy ID is required for update")
        const response = await apiClient<{ data: CreatedGatewayRule }>(
          `/api/gateway-policies/${id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        )
        return { rule: response.data, payload, mode: "edit" as const }
      }

      const response = await apiClient<{ data: CreatedGatewayRule }>(
        "/api/gateway-policies",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      )
      return { rule: response.data, payload, mode: "create" as const }
    },
    onSuccess: ({ rule, payload, mode: saveMode }) => {
      const listItem = toPolicyListItem(rule, payload)
      if (listItem) {
        queryClient.setQueriesData<PolicyListItem[]>(
          { queryKey: queryKeys.gatewayPolicies.list() },
          (current) => {
            if (saveMode === "edit") {
              const list = current ?? []
              const exists = list.some((p) => p.id === listItem.id)
              if (!exists) return [listItem, ...list]
              return list.map((p) => (p.id === listItem.id ? listItem : p))
            }
            return [
              listItem,
              ...(current ?? []).filter((policy) => policy.id !== listItem.id),
            ]
          }
        )
      }
      router.push("/content-policies")
    },
  })

  const selectedRule = selectedRuleId
    ? rulesList.find((rule) => rule.id === selectedRuleId)
    : undefined

  const headerBadge = selectedRule
    ? headerBadgeByType[selectedRule.type]
    : null

  const isYoutubeRestrictedRule = selectedRule?.type === "ytrestricted"
  const isSafeSearchRule = selectedRule?.type === "safesearch"
  const hideContentPickers = isYoutubeRestrictedRule || isSafeSearchRule

  const removeWebAddress = (id: string) => {
    if (!selectedRuleId) return
    const ruleId = selectedRuleId
    setAddressesByRule((prev) => ({
      ...prev,
      [ruleId]: (prev[ruleId] ?? []).filter((a) => a.id !== id),
    }))
  }

  const handleAddressModeChange = (mode: AddAddressMode) => {
    setAddressMode(mode)
    setAddressError("")
    setPendingAddresses((prev) => prev.map((p) => ({ ...p, mode })))
  }

  const handleDetectAddresses = () => {
    if (!addressInput.trim()) {
      setAddressError("Value is required")
      setPendingAddresses([])
      return
    }

    const parts = addressInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    if (addressMode === "keyword") {
      const keywords = parts
        .map((p) => p.trim().toLowerCase())
        .filter((p) => p.length >= 2)
      if (keywords.length === 0) {
        setAddressError("Keyword must be at least 2 characters")
        setPendingAddresses([])
        return
      }
      setAddressError("")
      setPendingAddresses(
        keywords.map((url) => ({
          id: nextId("pa"),
          url,
          mode: "keyword" as const,
          selected: true,
        }))
      )
      return
    }

    const normalized = parts.map(normalizeAddressPart)
    const invalid = normalized.filter((part) => !HOSTNAME_PATTERN.test(part))
    if (invalid.length > 0) {
      setAddressError(`Invalid hostname: ${invalid[0]}`)
      setPendingAddresses([])
      return
    }

    setAddressError("")
    setPendingAddresses(
      normalized.map((url) => ({
        id: nextId("pa"),
        url,
        mode: addressMode,
        selected: true,
      }))
    )
  }

  const togglePendingSelection = (id: string) => {
    setPendingAddresses((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, selected: !p.selected } : p
      )
    )
  }

  const addSelectedAddresses = () => {
    if (!selectedRuleId) return
    const ruleId = selectedRuleId
    const selected = pendingAddresses.filter((p) => p.selected)
    if (selected.length === 0) return
    setAddressesByRule((prev) => {
      const existing = prev[ruleId] ?? []
      const next = selected
        .filter(
          (p) =>
            !existing.some(
              (e) => e.url === p.url && e.mode === p.mode
            )
        )
        .map((p) => ({
          id: nextId("wa"),
          url: p.url,
          mode: p.mode,
        }))
      return {
        ...prev,
        [ruleId]: [...existing, ...next],
      }
    })
    setPendingAddresses([])
    setAddressInput("")
    setAddressError("")
    setIsAddAddressOpen(false)
  }

  const hasAnyPendingSelected = pendingAddresses.some((p) => p.selected)

  // ========== Create Rule modal state ==========
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false)
  const [createRuleTab, setCreateRuleTab] =
    useState<CreateRuleTab>("general")
  const [presetSearch, setPresetSearch] = useState("")

  // ========== Categories, Apps, Audience per rule ==========
  const [categoriesByRule, setCategoriesByRule] = useState<
    Record<string, PickedItem[]>
  >(() => {
    if (!initialData || !initialRule) return {}
    return { [initialRule.id]: initialData.categories }
  })
  const [appsByRule, setAppsByRule] = useState<Record<string, PickedItem[]>>(
    () => {
      if (!initialData || !initialRule) return {}
      return { [initialRule.id]: initialData.apps }
    }
  )
  const [audienceByRule, setAudienceByRule] = useState<
    Record<string, PickedItem[]>
  >(() => {
    if (!initialData || !initialRule) return {}
    return { [initialRule.id]: initialData.locations }
  })

  const currentCategories = selectedRuleId
    ? (categoriesByRule[selectedRuleId] ?? [])
    : []
  const currentApps = selectedRuleId ? (appsByRule[selectedRuleId] ?? []) : []
  const currentAudience = selectedRuleId
    ? (audienceByRule[selectedRuleId] ?? [])
    : []
  const currentAddresses = selectedRuleId
    ? (addressesByRule[selectedRuleId] ?? [])
    : []

  // Picker open states
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false)
  const [isAppPickerOpen, setIsAppPickerOpen] = useState(false)
  const [isAudiencePickerOpen, setIsAudiencePickerOpen] = useState(false)
  const [categoryPickerKey, setCategoryPickerKey] = useState(0)
  const [appPickerKey, setAppPickerKey] = useState(0)
  const [audiencePickerKey, setAudiencePickerKey] = useState(0)

  const categoriesQuery = useQuery({
    queryKey: queryKeys.gatewayPolicies.categories(),
    queryFn: () =>
      apiClient<PickerGroupsResponse>("/api/gateway-categories"),
    enabled: isCategoryPickerOpen,
    staleTime: 5 * 60 * 1000,
  })

  const appsQuery = useQuery({
    queryKey: queryKeys.gatewayPolicies.apps(),
    queryFn: () => apiClient<PickerGroupsResponse>("/api/gateway-apps"),
    enabled: isAppPickerOpen,
    staleTime: 5 * 60 * 1000,
  })

  const locationsQuery = useQuery({
    queryKey: queryKeys.gatewayPolicies.locations(),
    queryFn: () =>
      apiClient<PickerGroupsResponse>("/api/gateway-locations"),
    enabled: isAudiencePickerOpen,
    staleTime: 5 * 60 * 1000,
  })

  const createLocationMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiClient<{
        data: {
          id?: string
          name?: string
          client_default?: boolean
          doh_subdomain?: string
          ipv4_destination?: string
        }
      }>("/api/gateway-locations", {
        method: "POST",
        body: JSON.stringify({ name }),
      })
      return response.data
    },
    onSuccess: (location) => {
      if (!location.id || !selectedRuleId) return
      const ruleId = selectedRuleId
      const label = location.client_default
        ? `${(location.name ?? "Location").trim()} (default)`
        : (location.name ?? "Location").trim()
      const descriptionParts: string[] = []
      if (location.doh_subdomain?.trim()) {
        descriptionParts.push(
          `${location.doh_subdomain.trim()}.cloudflare-gateway.com`
        )
      }
      if (location.ipv4_destination?.trim()) {
        descriptionParts.push(location.ipv4_destination.trim())
      }

      queryClient.setQueryData<PickerGroupsResponse>(
        queryKeys.gatewayPolicies.locations(),
        (prev) => {
          const existing = prev?.groups ?? []
          const groupId = "locations"
          const nextItem = {
            id: location.id as string,
            label,
            description:
              descriptionParts.length > 0
                ? descriptionParts.join(" · ")
                : undefined,
            keywords: [
              location.id,
              location.name,
              location.doh_subdomain,
              location.ipv4_destination,
            ]
              .filter(Boolean)
              .join(" "),
          }
          const group = existing.find((g) => g.id === groupId)
          if (!group) {
            return {
              groups: [
                {
                  id: groupId,
                  label: "DNS LOCATIONS",
                  items: [nextItem],
                },
              ],
            }
          }
          if (group.items.some((i) => i.id === nextItem.id)) {
            return { groups: existing }
          }
          return {
            groups: existing.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    items: [...g.items, nextItem].sort((a, b) =>
                      a.label.localeCompare(b.label)
                    ),
                  }
                : g
            ),
          }
        }
      )

      setAudienceByRule((prev) => {
        if ((prev[ruleId] ?? []).some((a) => a.id === location.id)) {
          return prev
        }
        return {
          ...prev,
          [ruleId]: [
            ...(prev[ruleId] ?? []),
            {
              id: location.id as string,
              label,
              groupLabel: "DNS LOCATIONS",
            },
          ],
        }
      })
      setIsAudiencePickerOpen(false)
    },
  })

  const presetsQuery = useQuery({
    queryKey: queryKeys.gatewayPolicies.presets(),
    queryFn: () =>
      apiClient<GatewayPresetsResponse>("/api/gateway-presets"),
    enabled: isCreateRuleOpen && createRuleTab === "presets",
    staleTime: 5 * 60 * 1000,
  })

  const categoryGroups = categoriesQuery.data?.groups ?? []
  const appGroups = appsQuery.data?.groups ?? []
  const audienceGroups = locationsQuery.data?.groups ?? []
  const presetOptions = presetsQuery.data?.presets ?? []

  const groupLabelById = (
    groups: PickerGroup<string>[],
    id: string
  ): string => groups.find((g) => g.id === id)?.label ?? ""

  const handleCategorySelected = (item: {
    id: string
    label: string
    groupId: string
  }) => {
    if (!selectedRuleId) return
    const ruleId = selectedRuleId
    if (currentCategories.some((c) => c.id === item.id)) return
    setCategoriesByRule((prev) => ({
      ...prev,
      [ruleId]: [
        ...(prev[ruleId] ?? []),
        {
          id: item.id,
          label: item.label,
          groupLabel: groupLabelById(categoryGroups, item.groupId),
        },
      ],
    }))
  }
  const removeCategory = (id: string) => {
    if (!selectedRuleId) return
    const ruleId = selectedRuleId
    setCategoriesByRule((prev) => ({
      ...prev,
      [ruleId]: (prev[ruleId] ?? []).filter((c) => c.id !== id),
    }))
  }

  const handleAppSelected = (item: {
    id: string
    label: string
    groupId: string
  }) => {
    if (!selectedRuleId) return
    const ruleId = selectedRuleId
    if (currentApps.some((c) => c.id === item.id)) return
    setAppsByRule((prev) => ({
      ...prev,
      [ruleId]: [
        ...(prev[ruleId] ?? []),
        {
          id: item.id,
          label: item.label,
          groupLabel: groupLabelById(appGroups, item.groupId),
        },
      ],
    }))
  }
  const removeApp = (id: string) => {
    if (!selectedRuleId) return
    const ruleId = selectedRuleId
    setAppsByRule((prev) => ({
      ...prev,
      [ruleId]: (prev[ruleId] ?? []).filter((c) => c.id !== id),
    }))
  }

  const handleAudienceSelected = (item: {
    id: string
    label: string
    groupId: string
  }) => {
    if (!selectedRuleId) return
    const ruleId = selectedRuleId
    if (currentAudience.some((c) => c.id === item.id)) return
    setAudienceByRule((prev) => ({
      ...prev,
      [ruleId]: [
        ...(prev[ruleId] ?? []),
        {
          id: item.id,
          label: item.label,
          groupLabel: groupLabelById(audienceGroups, item.groupId),
        },
      ],
    }))
  }
  const removeAudience = (id: string) => {
    if (!selectedRuleId) return
    const ruleId = selectedRuleId
    setAudienceByRule((prev) => ({
      ...prev,
      [ruleId]: (prev[ruleId] ?? []).filter((c) => c.id !== id),
    }))
  }

  // ========== Schedule sheet state ==========
  const [isScheduleSheetOpen, setIsScheduleSheetOpen] = useState(false)
  const [scheduleMode, setScheduleMode] = useState<"add" | "edit">("add")
  const [schedulesByRule, setSchedulesByRule] = useState<
    Record<string, ScheduleBlock[]>
  >(() => {
    if (!initialData || !initialRule) return {}
    return {
      [initialRule.id]: initialData.schedules.map((s, index) => ({
        id: `sch-init-${index}`,
        dayIndex: s.dayIndex,
        startHour: s.startHour,
        startMinute: s.startMinute,
        durationMinutes: s.durationMinutes,
        saved: true,
      })),
    }
  })
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [scheduleSheetKey, setScheduleSheetKey] = useState(0)

  const currentSchedules = selectedRuleId
    ? (schedulesByRule[selectedRuleId] ?? [])
    : []

  const currentSnapshot = useMemo(() => {
    if (!selectedRule) return null
    return serializeEditorSnapshot({
      name: selectedRule.name,
      type: selectedRule.type,
      enabled: isActive,
      categoryIds: currentCategories.map((c) => c.id),
      appIds: currentApps.map((a) => a.id),
      locationIds: currentAudience.map((a) => a.id),
      addresses: currentAddresses.map((a) => ({
        url: a.url,
        mode: a.mode,
      })),
      schedules: currentSchedules.map((s) => ({
        dayIndex: s.dayIndex,
        startHour: s.startHour,
        startMinute: s.startMinute,
        durationMinutes: s.durationMinutes,
      })),
    })
  }, [
    selectedRule,
    isActive,
    currentCategories,
    currentApps,
    currentAudience,
    currentAddresses,
    currentSchedules,
  ])

  const isDirty =
    !isEditMode ||
    (baselineSnapshotRef.current != null &&
      currentSnapshot != null &&
      currentSnapshot !== baselineSnapshotRef.current)

  const draftSavePayload = useMemo((): CreateGatewayPolicyInput | null => {
    if (!selectedRule) return null

    const categoryIds = currentCategories
      .map((c) => Number(c.id))
      .filter((id) => Number.isFinite(id) && id > 0)

    const appIds = currentApps
      .map((a) => Number(a.id))
      .filter((id) => Number.isFinite(id) && id > 0)

    return {
      name: selectedRule.name,
      type: selectedRule.type,
      enabled: isActive,
      categories: currentCategories.map((c) => c.label),
      categoryIds,
      domains: currentAddresses
        .filter((a) => a.mode === "address")
        .map((a) => a.url),
      domainRoots: currentAddresses
        .filter((a) => a.mode === "auto")
        .map((a) => a.url),
      domainKeywords: currentAddresses
        .filter((a) => a.mode === "keyword")
        .map((a) => a.url),
      apps: currentApps.map((a) => a.label),
      appIds,
      locationIds: currentAudience.map((a) => a.id),
      schedules: currentSchedules.map((s) => ({
        dayIndex: s.dayIndex,
        startHour: s.startHour,
        startMinute: s.startMinute,
        durationMinutes: s.durationMinutes,
      })),
      timeZone:
        initialData?.timeZone ??
        (typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : undefined),
      precedence: initialData?.precedence ?? undefined,
    }
  }, [
    selectedRule,
    isActive,
    currentCategories,
    currentApps,
    currentAudience,
    currentAddresses,
    currentSchedules,
    initialData?.timeZone,
    initialData?.precedence,
  ])

  const isPayloadValid = useMemo(
    () =>
      draftSavePayload != null &&
      createGatewayPolicySchema.safeParse(draftSavePayload).success,
    [draftSavePayload]
  )

  const canSave =
    Boolean(selectedRule) &&
    !saveMutation.isPending &&
    (isCreateMode || isDirty) &&
    isPayloadValid

  const openAddSchedule = () => {
    setScheduleMode("add")
    setEditingScheduleId(null)
    setScheduleSheetKey((k) => k + 1)
    setIsScheduleSheetOpen(true)
  }

  const openEditSchedule = (scheduleId: string) => {
    setScheduleMode("edit")
    setEditingScheduleId(scheduleId)
    setScheduleSheetKey((k) => k + 1)
    setIsScheduleSheetOpen(true)
  }

  const handleSaveSchedules = (blocks: ScheduleBlock[]) => {
    if (!selectedRuleId) return
    const ruleId = selectedRuleId
    setSchedulesByRule((prev) => ({
      ...prev,
      [ruleId]: blocks,
    }))
  }

  const removeScheduleItem = (scheduleId: string) => {
    if (!selectedRuleId) return
    const ruleId = selectedRuleId
    setSchedulesByRule((prev) => ({
      ...prev,
      [ruleId]: prev[ruleId]?.filter((s) => s.id !== scheduleId) ?? [],
    }))
  }

  const buildRuleFromType = (type: PolicyType, nameHint?: string): RuleItem => {
    const defaults = typeBadgeDefaults[type]
    let name = nameHint ?? ""
    if (!name) {
      if (type === "allow") name = "Whitelist"
      else if (type === "block") name = "Blacklist"
      else if (type === "ytrestricted") name = "YouTube Restricted"
      else name = "SafeSearch on Supported Search Engines"
    }
    return {
      id: nextId("rule"),
      name,
      type,
      typeLabel: defaults.label,
      badgeClass: defaults.className,
    }
  }

  const handleCreateFromGeneral = (type: PolicyType) => {
    const newRule = buildRuleFromType(type)
    setRulesList((prev) => [...prev, newRule])
    setSelectedRuleId(newRule.id)
    setIsCreateRuleOpen(false)
  }

  const handleCreateFromPreset = (preset: GatewayPreset) => {
    const newRule = buildRuleFromType(preset.type, preset.name)
    setRulesList((prev) => [...prev, newRule])
    setSelectedRuleId(newRule.id)

    setCategoriesByRule((prev) => ({
      ...prev,
      [newRule.id]: preset.categories.map((c) => ({
        id: String(c.id),
        label: c.name,
        groupLabel: c.groupLabel ?? "PRESET",
      })),
    }))

    setAppsByRule((prev) => ({
      ...prev,
      [newRule.id]: preset.apps.map((a) => ({
        id: String(a.id),
        label: a.name,
        groupLabel: a.groupLabel ?? "PRESET",
      })),
    }))

    if (preset.domains.length > 0) {
      setAddressesByRule((prev) => ({
        ...prev,
        [newRule.id]: preset.domains.map((url) => ({
          id: nextId("wa"),
          url,
          mode: "auto" as const,
        })),
      }))
    }

    setIsActive(true)
    setIsCreateRuleOpen(false)
  }

  const filteredPresets = presetOptions.filter((p) => {
    if (!presetSearch.trim()) return true
    const q = presetSearch.trim().toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    )
  })

  const handleSaveSelectedRule = () => {
    if (!draftSavePayload || !isPayloadValid) return
    saveMutation.mutate(draftSavePayload)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-brand-text-muted hover:text-brand-primary"
          asChild
        >
          <Link href="/content-policies" aria-label="Back to content policies">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-brand-text-heading md:text-3xl">
            {isCreateMode ? "New Policy" : "Edit Policy"}
          </h1>
          {!isCreateMode && (initialData?.name || selectedRule?.name) ? (
            <p className="mt-1 text-sm text-brand-text-muted">
              {initialData?.name ?? selectedRule?.name}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left sidebar: Rules list — column on mobile + desktop */}
        <aside className="border-b border-border/60 bg-brand-background lg:sticky lg:top-20 lg:z-10 lg:max-h-[calc(100svh-7rem)] lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 border-border/60 px-5 py-4">
            <span className="text-sm font-semibold uppercase tracking-wider text-brand-text-muted">
              Rules
            </span>
            <Dialog
              open={isCreateRuleOpen}
              onOpenChange={setIsCreateRuleOpen}
            >
              <DialogTrigger asChild>
                <Button type="button" className="h-9 gap-2 px-4">
                  <Plus className="size-4" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent
                showCloseButton
                className="max-w-[560px] p-0 shadow-2xl ring-0 max-sm:w-[calc(100%-1.5rem)] max-sm:max-h-[min(90svh,720px)] max-sm:overflow-hidden sm:max-w-[560px]"
              >
                <div className="flex flex-col max-sm:max-h-[min(90svh,720px)]">
                <div className="flex shrink-0 items-center justify-between px-6 pt-6 pb-4 max-sm:px-4 max-sm:pt-5 max-sm:pb-3">
                  <DialogTitle className="text-xl font-bold tracking-tight text-brand-text-heading max-sm:text-lg">
                    Create a New Rule
                  </DialogTitle>
                </div>

                {/* 2 Tabs: General / Presets */}
                <div className="shrink-0 px-6 pb-4 max-sm:px-4 max-sm:pb-3">
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
                    {(
                      [
                        { key: "general", label: "General" },
                        { key: "presets", label: "Presets" },
                      ] as { key: CreateRuleTab; label: string }[]
                    ).map((tab) => {
                      const active = createRuleTab === tab.key
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setCreateRuleTab(tab.key)}
                          className={cn(
                            "rounded-md py-2.5 text-sm font-medium transition-all",
                            active
                              ? "bg-brand-primary text-white shadow-sm"
                              : "text-brand-text-heading hover:bg-gray-200/60"
                          )}
                        >
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Tab content */}
                <div className="px-6 pb-5 max-sm:min-h-0 max-sm:flex-1 max-sm:overflow-y-auto max-sm:overscroll-contain max-sm:px-4">
                  {createRuleTab === "general" ? (
                    <div className="space-y-3">
                      {generalRuleOptions.map((opt) => (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => handleCreateFromGeneral(opt.type)}
                          className="group relative flex w-full items-start justify-between gap-3 rounded-md border border-border/70 bg-white p-4 text-left transition-all hover:border-brand-primary/40 hover:bg-brand-primary/[0.03]"
                        >
                          <div className="min-w-0 flex-1 space-y-2">
                            <Badge
                              className={cn(
                                "rounded-sm px-2.5 py-1 text-[11px] font-bold tracking-wider",
                                presetBadgeClass[opt.type]
                              )}
                            >
                              {typeBadgeDefaults[opt.type].label}
                            </Badge>
                            {opt.title ? (
                              <p className="text-sm font-semibold text-brand-text-heading">
                                {opt.title}
                              </p>
                            ) : null}
                            <p className="text-sm leading-relaxed text-brand-text-muted">
                              {opt.description}
                            </p>
                          </div>
                          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70 text-brand-primary transition-colors group-hover:border-brand-primary group-hover:bg-brand-primary group-hover:text-white">
                            <ArrowUpRight className="size-4" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-text-muted" />
                        <Input
                          value={presetSearch}
                          onChange={(e) => setPresetSearch(e.target.value)}
                          placeholder="Search presets"
                          className="h-11 border-0 bg-gray-50 pl-10 text-sm focus-visible:ring-0 focus-visible:border-brand-primary/50"
                        />
                      </div>
                      <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1 max-sm:max-h-[min(50svh,420px)] max-sm:overscroll-contain">
                        {presetsQuery.isLoading || presetsQuery.isFetching ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-brand-text-muted">
                            <CustomSpinner className="size-5 text-brand-primary" />
                          </div>
                        ) : presetsQuery.isError ? (
                          <div
                            role="alert"
                            className="flex flex-col items-center justify-center py-10 text-center text-sm text-destructive"
                          >
                            {presetsQuery.error instanceof Error
                              ? presetsQuery.error.message
                              : "Failed to load presets"}
                          </div>
                        ) : filteredPresets.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-sm text-brand-text-muted">
                            No presets match your search.
                          </div>
                        ) : (
                          filteredPresets.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleCreateFromPreset(p)}
                              className="group relative flex w-full items-start justify-between gap-3 rounded-md border border-border/70 bg-white p-3.5 text-left transition-all hover:border-brand-primary/40 hover:bg-brand-primary/[0.03]"
                            >
                              <div className="min-w-0 flex-1 space-y-1.5">
                                <Badge
                                  className={cn(
                                    "rounded-sm px-2 py-0.5 text-[10px] font-bold tracking-wider",
                                    presetBadgeClass[p.type]
                                  )}
                                >
                                  {p.badgeText ??
                                    typeBadgeDefaults[p.type].label}
                                </Badge>
                                <p className="truncate text-sm font-semibold text-brand-text-heading">
                                  {p.name}
                                </p>
                                <p className="text-xs leading-relaxed text-brand-text-muted">
                                  {p.description}
                                </p>
                                {(p.categories.length > 0 ||
                                  p.apps.length > 0 ||
                                  p.domains.length > 0) && (
                                  <p className="text-[11px] text-brand-text-muted">
                                    {[
                                      p.categories.length > 0
                                        ? `${p.categories.length} categories`
                                        : null,
                                      p.apps.length > 0
                                        ? `${p.apps.length} apps`
                                        : null,
                                      p.domains.length > 0
                                        ? `${p.domains.length} domains`
                                        : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                )}
                              </div>
                              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border/70 text-brand-primary transition-colors group-hover:border-brand-primary group-hover:bg-brand-primary group-hover:text-white">
                                <ArrowUpRight className="size-3.5" />
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex max-h-[min(40vh,280px)] flex-col overflow-y-auto lg:max-h-none lg:overflow-visible">
            {rulesList.map((rule, idx) => {
              const isSelected = rule.id === selectedRuleId
              return (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => setSelectedRuleId(rule.id)}
                  className={cn(
                    "group relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
                    isSelected
                      ? "bg-brand-primary/5"
                      : "hover:bg-muted/40"
                  )}
                >
                  {isSelected && (
                    <span className="absolute left-0 top-0 h-full w-[3px] rounded-r bg-brand-primary" />
                  )}
                  {idx === 0 && isSelected && (
                    <span className="absolute inset-x-0 top-0 hidden h-px bg-brand-primary/20 lg:block" />
                  )}
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <RuleTypeIcon type={rule.type} />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "whitespace-normal break-words text-sm font-medium leading-snug",
                          isSelected
                            ? "font-semibold text-brand-primary"
                            : "text-brand-text-heading"
                        )}
                      >
                        {rule.name}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      "shrink-0 self-start rounded-sm px-2 py-0.5 text-[10px] font-bold tracking-wider",
                      rule.badgeClass
                    )}
                  >
                    {rule.typeLabel}
                  </Badge>
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 self-start lg:hidden",
                      isSelected
                        ? "text-brand-primary"
                        : "text-brand-text-muted"
                    )}
                  />
                </button>
              )
            })}
          </div>
        </aside>

        {/* Right side: Rule detail */}
        <div className="min-w-0">
          {selectedRule && headerBadge ? (
            <>
          {/* Rule header */}
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <Badge
                className={cn(
                  "rounded-sm px-2.5 py-1 text-[11px] font-bold tracking-wider",
                  headerBadge.class
                )}
              >
                {headerBadge.text}
              </Badge>
              <h2 className="text-lg font-semibold text-brand-text-heading">
                {selectedRule.name}
              </h2>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-brand-text-muted hover:text-brand-text-heading"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
              <Label
                htmlFor="rule-active-switch"
                className="cursor-pointer text-sm font-medium text-brand-text-heading"
              >
                Active
              </Label>
              <Switch
                id="rule-active-switch"
                size="lg"
                showCheckedIcon
                checked={isActive}
                onCheckedChange={setIsActive}
                className="data-checked:bg-brand-primary data-unchecked:bg-gray-200 focus-visible:ring-brand-primary/20 [&_[data-slot=switch-thumb]]:bg-white [&_[data-slot=switch-thumb]]:shadow-sm"
              />
            </div>
          </div>

          {/* Rule sections */}
          <div className="space-y-8 px-5 py-6">
            {!hideContentPickers ? (
            <>
            {/* Categories */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-sm font-semibold text-brand-text-heading">
                    Categories
                  </h3>
                  <span className="text-sm text-brand-text-muted">
                    ({currentCategories.length})
                  </span>
                </div>
                <Button
                  variant="brandOutline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => {
                    setCategoryPickerKey((k) => k + 1)
                    setIsCategoryPickerOpen(true)
                  }}
                >
                  <Plus className="size-3.5" />
                  Add category
                </Button>
              </div>

              {currentCategories.length === 0 ? (
                <div className="flex min-h-[140px] flex-col items-center justify-center rounded-md border border-border/70 bg-white px-4 py-10 text-center">
                  <div className="mb-3 text-brand-text-muted/70">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-10"
                    >
                      <path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5z" />
                      <circle cx="18" cy="5" r="2" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-brand-text-heading">
                    No categories yet
                  </p>
                  <div className="mt-1.5 max-w-md text-sm leading-relaxed text-brand-text-muted">
                    Select a category to allow
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-border/70 bg-white divide-y divide-border/50">
                  {(() => {
                    const byGroup: Record<string, PickedItem[]> = {}
                    currentCategories.forEach((c) => {
                      const key = c.groupLabel || "OTHERS"
                      if (!byGroup[key]) byGroup[key] = []
                      byGroup[key].push(c)
                    })
                    return Object.keys(byGroup).map((groupLabel) => (
                      <div key={groupLabel} className="px-4 py-3">
                        <div className="mb-2.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-text-muted bg-gray-100 px-2.5 py-1 rounded">
                            {groupLabel}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {byGroup[groupLabel].map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between gap-3 rounded-md border border-brand-primary/20 bg-brand-primary/[0.04] px-3.5 py-2.5 group hover:border-brand-primary/40"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-brand-primary/15 text-brand-primary">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="size-4"
                                  >
                                    <path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5z" />
                                  </svg>
                                </div>
                                <p className="text-sm font-semibold text-brand-text-heading truncate">
                                  {c.label}
                                </p>
                              </div>
                              <div className="shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 group-hover:flex transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => removeCategory(c.id)}
                                  className="rounded-md p-1.5 text-brand-text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                                  aria-label="Remove category"
                                  title="Remove"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>

            {/* Apps */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-sm font-semibold text-brand-text-heading">
                    Apps
                  </h3>
                  <span className="text-sm text-brand-text-muted">
                    ({currentApps.length})
                  </span>
                </div>
                <Button
                  variant="brandOutline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => {
                    setAppPickerKey((k) => k + 1)
                    setIsAppPickerOpen(true)
                  }}
                >
                  <Plus className="size-3.5" />
                  Add app
                </Button>
              </div>

              {currentApps.length === 0 ? (
                <div className="flex min-h-[140px] flex-col items-center justify-center rounded-md border border-border/70 bg-white px-4 py-10 text-center">
                  <div className="mb-3 text-brand-text-muted/70">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-10"
                    >
                      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-brand-text-heading">
                    No apps yet
                  </p>
                  <div className="mt-1.5 max-w-md text-sm leading-relaxed text-brand-text-muted">
                    Select an app to allow
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-border/70 bg-white divide-y divide-border/50">
                  {(() => {
                    const byGroup: Record<string, PickedItem[]> = {}
                    currentApps.forEach((c) => {
                      const key = c.groupLabel || "OTHERS"
                      if (!byGroup[key]) byGroup[key] = []
                      byGroup[key].push(c)
                    })
                    return Object.keys(byGroup).map((groupLabel) => (
                      <div key={groupLabel} className="px-4 py-3">
                        <div className="mb-2.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-text-muted bg-gray-100 px-2.5 py-1 rounded">
                            {groupLabel}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {byGroup[groupLabel].map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between gap-3 rounded-md border border-brand-primary/20 bg-brand-primary/[0.04] px-3.5 py-2.5 group hover:border-brand-primary/40"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-brand-primary/15 text-brand-primary">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="size-4"
                                  >
                                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                                  </svg>
                                </div>
                                <p className="text-sm font-semibold text-brand-text-heading truncate">
                                  {c.label}
                                </p>
                              </div>
                              <div className="shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 group-hover:flex transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => removeApp(c.id)}
                                  className="rounded-md p-1.5 text-brand-text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                                  aria-label="Remove app"
                                  title="Remove"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>

            {/* Web addresses — per selected rule; tabs drive match mode */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-sm font-semibold text-brand-text-heading">
                    Web addresses
                  </h3>
                  <span className="text-sm text-brand-text-muted">
                    ({currentAddresses.length})
                  </span>
                </div>
                <Dialog
                  open={isAddAddressOpen}
                  onOpenChange={(open) => {
                    setIsAddAddressOpen(open)
                    if (!open) {
                      setPendingAddresses([])
                      setAddressInput("")
                      setAddressError("")
                      setAddressMode("auto")
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="brandOutline" size="sm" className="h-8 gap-1.5">
                      <Plus className="size-3.5" />
                      Add address
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    showCloseButton
                    className="max-w-[620px] p-0 shadow-2xl ring-0 max-sm:w-[calc(100%-1.5rem)] max-sm:max-h-[min(90svh,720px)] max-sm:overflow-y-auto max-sm:overscroll-contain sm:max-w-[620px]"
                  >
                    <div className="flex items-center justify-between px-6 pt-6 pb-4 max-sm:px-4 max-sm:pt-5 max-sm:pb-3">
                      <DialogTitle className="text-xl font-bold tracking-tight text-brand-text-heading max-sm:text-lg">
                        Add a web address
                      </DialogTitle>
                    </div>

                    <div className="space-y-4 px-6 pb-4 max-sm:px-4 max-sm:pb-5">
                      {/* Mode tabs — drive validation + Gateway selector */}
                      <div className="flex items-center gap-1 border-b border-border/70">
                        {(
                          ["auto", "address", "keyword"] as AddAddressMode[]
                        ).map((key) => {
                          const tab = addressTabMeta[key]
                          const active = addressMode === key
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleAddressModeChange(key)}
                              className={cn(
                                "relative px-4 py-2.5 text-sm font-medium transition-colors",
                                active
                                  ? "text-brand-text-heading bg-gray-100 rounded-t-md"
                                  : "text-brand-text-heading hover:bg-gray-50 rounded-t-md"
                              )}
                            >
                              {tab.label}
                              {active && (
                                <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-brand-primary" />
                              )}
                            </button>
                          )
                        })}
                      </div>

                      <p className="text-sm text-brand-text-muted">
                        {addressTabMeta[addressMode].hint}
                      </p>

                      {/* Input + Add — uses active tab mode */}
                      <div className="space-y-2">
                        <div className="flex w-full items-stretch overflow-hidden rounded-md border-2 border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20">
                          <Input
                            value={addressInput}
                            onChange={(e) => {
                              setAddressInput(e.target.value)
                              if (e.target.value.trim()) {
                                setAddressError("")
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                handleDetectAddresses()
                              }
                            }}
                            placeholder={addressTabMeta[addressMode].placeholder}
                            className="h-12 border-0 bg-white text-base px-4 py-3 text-brand-text-heading placeholder:text-brand-text-placeholder focus-visible:border-0 focus-visible:ring-0"
                          />
                          <Button
                            type="button"
                            onClick={handleDetectAddresses}
                            className="h-auto rounded-none border-l border-brand-primary/20 px-6 shadow-none"
                          >
                            Add
                          </Button>
                        </div>
                        {addressError && (
                          <p className="text-sm font-medium text-red-500 pl-0.5">
                            {addressError}
                          </p>
                        )}
                      </div>

                      {/* Detected / pending list */}
                      <div className="min-h-[160px] rounded-md">
                        {pendingAddresses.length === 0 ? (
                          <div className="h-full flex items-center justify-center py-10 text-sm text-brand-text-muted">
                            Enter{" "}
                            {addressMode === "keyword"
                              ? "keywords"
                              : "addresses"}{" "}
                            above and click &quot;Add&quot; to preview
                            selections.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {pendingAddresses.map((pa) => (
                              <div
                                key={pa.id}
                                onClick={() => togglePendingSelection(pa.id)}
                                className={cn(
                                  "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition-colors",
                                  pa.selected
                                    ? "border-brand-primary/40 bg-brand-primary/5"
                                    : "border-border/70 bg-white hover:border-brand-primary/20 hover:bg-gray-50"
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex size-5 shrink-0 items-center justify-center rounded-sm border transition-colors",
                                    pa.selected
                                      ? "border-brand-primary bg-brand-primary"
                                      : "border-gray-300 bg-white"
                                  )}
                                >
                                  {pa.selected && (
                                    <Check className="size-3.5 text-white" />
                                  )}
                                </div>
                                <span className="font-mono text-sm text-brand-text-heading">
                                  {pa.url}
                                </span>
                                <Badge
                                  className={cn(
                                    "ml-auto rounded-sm px-2 py-0.5 text-[10px] font-bold tracking-wider",
                                    pa.mode === "keyword"
                                      ? "bg-violet-700 text-white hover:bg-violet-700"
                                      : pa.mode === "address"
                                      ? "bg-blue-700 text-white hover:bg-blue-700"
                                      : "bg-gray-700 text-white hover:bg-gray-700"
                                  )}
                                >
                                  {addressTag(pa.mode)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end px-6 py-4 border-t border-border/50 bg-gray-50/40 rounded-b-xl">
                      <Button
                        size="lg"
                        disabled={!hasAnyPendingSelected}
                        onClick={addSelectedAddresses}
                        className={
                          hasAnyPendingSelected
                            ? undefined
                            : "bg-brand-primary/25 text-white shadow-none hover:bg-brand-primary/25"
                        }
                      >
                        Add Selections
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="rounded-md border border-border/70 bg-white divide-y divide-border/50">
                {currentAddresses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                    <div className="mb-3 text-brand-text-muted/70">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-10"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-brand-text-heading">
                      No web addresses yet
                    </p>
                    <p className="mt-1 max-w-xs text-sm text-brand-text-muted">
                      Enter a domain, host, or keyword to{" "}
                      {selectedRule.type === "block" ? "block" : "allow"}
                    </p>
                  </div>
                ) : (
                  currentAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-muted/20"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="rounded border border-border/60 bg-gray-50 px-2 py-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                            {addressTag(addr.mode)}
                          </span>
                        </div>
                        <span className="truncate font-mono text-sm text-brand-text-heading">
                          {addr.url}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeWebAddress(addr.id)}
                        className="shrink-0 rounded-md p-1 text-brand-text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                        aria-label="Remove"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            </>
            ) : null}

            {/* Audience */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-sm font-semibold text-brand-text-heading">
                    Audience
                  </h3>
                  <span className="text-sm text-brand-text-muted">
                    ({currentAudience.length})
                  </span>
                </div>
                <Button
                  variant="brandOutline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => {
                    setAudiencePickerKey((k) => k + 1)
                    setIsAudiencePickerOpen(true)
                  }}
                >
                  <Plus className="size-3.5" />
                  Add location
                </Button>
              </div>

              {currentAudience.length === 0 ? (
                <div className="flex min-h-[140px] flex-col items-center justify-center rounded-md border border-border/70 bg-white px-4 py-10 text-center">
                  <div className="mb-3 text-brand-text-muted/70">
                    <Users2 className="size-10" />
                  </div>
                  <p className="text-sm font-semibold text-brand-text-heading">
                    No audience yet
                  </p>
                  <div className="mt-1.5 max-w-md text-sm leading-relaxed text-brand-text-muted">
                    This rule applies to all Gateway DNS locations by default.
                    Add a location to scope the rule to specific devices or
                    networks.
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-border/70 bg-white divide-y divide-border/50">
                  {(() => {
                    const byGroup: Record<string, PickedItem[]> = {}
                    currentAudience.forEach((c) => {
                      const key = c.groupLabel || "OTHERS"
                      if (!byGroup[key]) byGroup[key] = []
                      byGroup[key].push(c)
                    })
                    return Object.keys(byGroup).map((groupLabel) => (
                      <div key={groupLabel} className="px-4 py-3">
                        <div className="mb-2.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-text-muted bg-gray-100 px-2.5 py-1 rounded">
                            {groupLabel}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {byGroup[groupLabel].map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between gap-3 rounded-md border border-brand-primary/20 bg-brand-primary/[0.04] px-3.5 py-2.5 group hover:border-brand-primary/40"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-brand-primary/15 text-brand-primary">
                                  <Users2 className="size-4" />
                                </div>
                                <p className="text-sm font-semibold text-brand-text-heading truncate">
                                  {c.label}
                                </p>
                              </div>
                              <div className="shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 group-hover:flex transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => removeAudience(c.id)}
                                  className="rounded-md p-1.5 text-brand-text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                                  aria-label="Remove audience"
                                  title="Remove"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>

            {/* Schedules */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-sm font-semibold text-brand-text-heading">
                    Schedules
                  </h3>
                  <span className="text-sm text-brand-text-muted">
                    ({currentSchedules.length})
                  </span>
                </div>
                <Button
                  variant="brandOutline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={openAddSchedule}
                >
                  <Plus className="size-3.5" />
                  Add schedule
                </Button>
              </div>

              {currentSchedules.length === 0 ? (
                <div className="flex min-h-[140px] flex-col items-center justify-center rounded-md border border-border/70 bg-white px-4 py-10 text-center">
                  <div className="mb-3 text-brand-text-muted/70">
                    <CalendarDays className="size-10" />
                  </div>
                  <p className="text-sm font-semibold text-brand-text-heading">
                    No schedule yet
                  </p>
                  <div className="mt-1.5 max-w-md text-sm leading-relaxed text-brand-text-muted">
                    <>
                      This rule is always active. Add a schedule to
                      <br />
                      scope this rule to a specific day and time
                    </>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-border/70 bg-white divide-y divide-border/50">
                  {/* Group blocks by day */}
                  {(() => {
                    const byDay: Record<number, ScheduleBlock[]> = {}
                    currentSchedules.forEach((s) => {
                      if (!byDay[s.dayIndex]) byDay[s.dayIndex] = []
                      byDay[s.dayIndex].push(s)
                    })
                    const orderedDays = Object.keys(byDay)
                      .map(Number)
                      .sort((a, b) => a - b)

                    return orderedDays.map((dayIdx) => (
                      <div key={dayIdx} className="px-4 py-3">
                        <div className="flex items-center gap-3 mb-2.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-text-muted bg-gray-100 px-2.5 py-1 rounded">
                            {DAYS_LABELS[dayIdx]}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {byDay[dayIdx].map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between gap-3 rounded-md border border-brand-primary/20 bg-brand-primary/[0.04] px-3.5 py-2.5 group hover:border-brand-primary/40"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-brand-primary/15 text-brand-primary">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="size-4"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-brand-text-heading font-mono">
                                    {formatScheduleRange(s)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => openEditSchedule(s.id)}
                                  className="rounded-md p-1.5 text-brand-text-muted hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
                                  aria-label="Edit schedule"
                                  title="Edit"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="size-3.5"
                                  >
                                    <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeScheduleItem(s.id)}
                                  className="rounded-md p-1.5 text-brand-text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                                  aria-label="Remove schedule"
                                  title="Remove"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>

            {/* Category Picker — Cloudflare Gateway categories */}
            <PickerDialog
              key={`category-picker-${categoryPickerKey}`}
              open={isCategoryPickerOpen}
              onOpenChange={setIsCategoryPickerOpen}
              searchPlaceholder="Search Cloudflare categories..."
              groups={categoryGroups}
              selectedIds={currentCategories.map((c) => c.id)}
              onSelect={handleCategorySelected}
              isLoading={categoriesQuery.isLoading || categoriesQuery.isFetching}
              errorMessage={
                categoriesQuery.isError
                  ? categoriesQuery.error instanceof Error
                    ? categoriesQuery.error.message
                    : "Failed to load categories"
                  : undefined
              }
            />

            {/* App Picker — Cloudflare Gateway app_types */}
            <PickerDialog
              key={`app-picker-${appPickerKey}`}
              open={isAppPickerOpen}
              onOpenChange={setIsAppPickerOpen}
              searchPlaceholder="Search Cloudflare apps..."
              groups={appGroups}
              selectedIds={currentApps.map((c) => c.id)}
              onSelect={handleAppSelected}
              isLoading={appsQuery.isLoading || appsQuery.isFetching}
              errorMessage={
                appsQuery.isError
                  ? appsQuery.error instanceof Error
                    ? appsQuery.error.message
                    : "Failed to load apps"
                  : undefined
              }
            />

            {/* Audience Picker — Gateway DNS locations */}
            <PickerDialog
              key={`audience-picker-${audiencePickerKey}`}
              open={isAudiencePickerOpen}
              onOpenChange={(open) => {
                setIsAudiencePickerOpen(open)
                if (!open) createLocationMutation.reset()
              }}
              searchPlaceholder="Search DNS locations by name, DoH, or IP..."
              groups={audienceGroups}
              selectedIds={currentAudience.map((c) => c.id)}
              onSelect={handleAudienceSelected}
              isLoading={
                locationsQuery.isLoading || locationsQuery.isFetching
              }
              errorMessage={
                locationsQuery.isError
                  ? locationsQuery.error instanceof Error
                    ? locationsQuery.error.message
                    : "Failed to load locations"
                  : undefined
              }
              emptyCreate={{
                noun: "DNS location",
                nounPlural: "DNS locations",
                onCreate: (name) => createLocationMutation.mutate(name),
                isPending: createLocationMutation.isPending,
                errorMessage: createLocationMutation.isError
                  ? createLocationMutation.error instanceof Error
                    ? createLocationMutation.error.message
                    : "Failed to create DNS location"
                  : undefined,
              }}
            />

            {/* Schedule Sheet (right side) */}
            <ScheduleSheet
              key={`schedule-sheet-${scheduleSheetKey}`}
              open={isScheduleSheetOpen}
              onOpenChange={setIsScheduleSheetOpen}
              mode={scheduleMode}
              initialBlocks={currentSchedules}
              onSave={handleSaveSchedules}
            />

          </div>

          {/* Sticky save bar */}
          <div className="sticky bottom-0 z-20 border-t border-border/60 bg-brand-background/95 px-5 py-4 backdrop-blur supports-[backdrop-filter]:bg-brand-background/85">
            <div className="flex flex-col items-end gap-2">
              {saveMutation.isError ? (
                <p className="w-full text-sm text-destructive">
                  {saveMutation.error instanceof Error
                    ? saveMutation.error.message
                    : isEditMode
                      ? "Failed to update policy"
                      : "Failed to save policy"}
                </p>
              ) : selectedRule &&
                !isPayloadValid &&
                selectedRule.type !== "safesearch" &&
                selectedRule.type !== "ytrestricted" ? (
                <p className="w-full text-sm text-brand-text-muted">
                  Add at least one category, app, web address, or audience
                  location to save.
                </p>
              ) : null}
              <Button
                size="lg"
                type="button"
                disabled={!canSave}
                onClick={handleSaveSelectedRule}
              >
                {saveMutation.isPending ? <CustomSpinner /> : null}
                {isEditMode ? "Save changes" : "Save policy"}
              </Button>
            </div>
          </div>
            </>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-5 py-10 text-center">
              <p className="text-base font-semibold text-brand-text-heading">
                {isCreateMode ? "Create your first rule" : "Select a rule"}
              </p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-brand-text-muted">
                {isCreateMode
                  ? "Add a rule from the left panel to start building this policy."
                  : "Choose a rule from the list to view and edit its settings."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RuleTypeIcon({ type }: { type: PolicyType }) {
  const classes = "size-5 shrink-0"
  switch (type) {
    case "allow":
      return (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-green-50 text-green-700">
          <ShieldCheck className={classes} />
        </div>
      )
    case "block":
      return (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600">
          <ShieldAlert className={classes} />
        </div>
      )
    case "ytrestricted":
      return (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-700">
          <Shield className={classes} />
        </div>
      )
    case "safesearch":
      return (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          <ShieldCheck className={classes} />
        </div>
      )
  }
}

const DAYS_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function formatScheduleRange(s: ScheduleBlock) {
  const pad = (n: number) => n.toString().padStart(2, "0")
  const startTotal = s.startHour * 60 + s.startMinute
  const endTotal = startTotal + s.durationMinutes
  const endH = Math.floor(endTotal / 60) % 24
  const endM = endTotal % 60
  const endHDisplay = endH === 0 ? 12 : endH > 12 ? endH - 12 : endH
  const endSuffix = endH < 12 ? "am" : "pm"
  const startHDisplay = s.startHour === 0 ? 12 : s.startHour > 12 ? s.startHour - 12 : s.startHour
  const startSuffix = s.startHour < 12 ? "am" : "pm"
  return `${startHDisplay}:${pad(s.startMinute)} ${startSuffix} — ${endHDisplay}:${pad(endM)} ${endSuffix}`
}

type SectionBlockProps = {
  title: string
  count: number
  addLabel: string
  emptyIcon: React.ReactNode
  emptyTitle: string
  emptySubtitle: React.ReactNode
}

function SectionBlock({
  title,
  count,
  addLabel,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
}: SectionBlockProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <h3 className="text-sm font-semibold text-brand-text-heading">
            {title}
          </h3>
          <span className="text-sm text-brand-text-muted">({count})</span>
        </div>
        <Button variant="brandOutline" size="sm" className="h-8 gap-1.5">
          <Plus className="size-3.5" />
          {addLabel}
        </Button>
      </div>
      <div className="flex min-h-[140px] flex-col items-center justify-center rounded-md border border-border/70 bg-white px-4 py-10 text-center">
        <div className="mb-3 text-brand-text-muted/70">{emptyIcon}</div>
        <p className="text-sm font-semibold text-brand-text-heading">
          {emptyTitle}
        </p>
        <div className="mt-1.5 max-w-md text-sm leading-relaxed text-brand-text-muted">
          {emptySubtitle}
        </div>
      </div>
    </div>
  )
}
