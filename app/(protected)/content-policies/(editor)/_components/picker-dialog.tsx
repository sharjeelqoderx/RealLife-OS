"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CustomSpinner } from "@/components/feedback/custom-spinner"
import { cn } from "@/lib/utils"

export type PickerGroup<T extends string = string> = {
  id: T
  label: string
  items: {
    id: string
    label: string
    /** Secondary line under the label (e.g. DoH hostname). */
    description?: string
    /** Extra text matched by search (ids, IPs, subdomains). */
    keywords?: string
  }[]
}

export type PickerEmptyCreate = {
  /** Singular noun for create button, e.g. "DNS location". */
  noun: string
  /** Plural for empty copy, e.g. "DNS locations". Defaults to `${noun}s`. */
  nounPlural?: string
  /** Extra guidance under the empty / create affordance. */
  createHint?: string
  onCreate: (name: string) => void
  isPending?: boolean
  errorMessage?: string
}

type Props<TGroupId extends string> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  searchPlaceholder: string
  groups: PickerGroup<TGroupId>[]
  selectedIds?: string[]
  onSelect?: (item: {
    id: string
    label: string
    groupId: TGroupId
    description?: string
  }) => void
  isLoading?: boolean
  errorMessage?: string
  /** When set, empty / no-match states offer create from the search query. */
  emptyCreate?: PickerEmptyCreate
}

export function PickerDialog<TGroupId extends string>({
  open,
  onOpenChange,
  searchPlaceholder,
  groups,
  selectedIds = [],
  onSelect,
  isLoading = false,
  errorMessage,
  emptyCreate,
}: Props<TGroupId>) {
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (open) {
      setQuery("")
    }
  }, [open])

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return groups
      .map((g) => ({
        ...g,
        items: q
          ? g.items.filter((i) => {
              const haystack = [i.label, i.description, i.keywords]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
              return haystack.includes(q)
            })
          : g.items,
      }))
      .filter((g) => g.items.length > 0)
  }, [query, groups])

  const handleSelect = (
    item: { id: string; label: string; description?: string },
    groupId: TGroupId
  ) => {
    onSelect?.({ ...item, groupId })
    onOpenChange(false)
  }

  const trimmedQuery = query.trim()
  const canCreate =
    Boolean(emptyCreate) &&
    trimmedQuery.length > 0 &&
    !emptyCreate?.isPending

  const handleCreate = () => {
    if (!emptyCreate || !canCreate) return
    emptyCreate.onCreate(trimmedQuery)
  }

  const totalItems = groups.reduce((n, g) => n + g.items.length, 0)
  const nounPlural =
    emptyCreate?.nounPlural ??
    (emptyCreate ? `${emptyCreate.noun}s` : "results")
  const emptyMessage = trimmedQuery
    ? `No ${nounPlural} match your search.`
    : totalItems === 0 && emptyCreate
      ? `No ${nounPlural} yet. Type a name above to create one.`
      : "No results."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[620px] gap-0 rounded-[20px] border-0 bg-white p-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] ring-0 max-sm:w-[calc(100%-1.5rem)] max-sm:max-h-[min(90svh,720px)] max-sm:overflow-hidden max-sm:rounded-2xl sm:max-w-[620px]"
      >
        <div className="flex flex-col max-sm:max-h-[min(90svh,720px)]">
          <div className="flex shrink-0 items-center gap-3 px-6 pt-6 pb-5 max-sm:px-4 max-sm:pt-5 max-sm:pb-4">
            <div className="flex flex-1 items-center gap-3">
              <Search className="size-5 shrink-0 text-brand-text-muted" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                disabled={emptyCreate?.isPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canCreate) {
                    e.preventDefault()
                    handleCreate()
                  }
                }}
                className="h-9 border-0 bg-transparent px-0 text-base text-brand-text-heading shadow-none placeholder:text-brand-text-placeholder focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="shrink-0 rounded-md p-1.5 text-brand-text-muted transition-colors hover:bg-gray-100 hover:text-brand-text-heading"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mx-6 h-px shrink-0 bg-border/60 max-sm:mx-4" />

          <div className="max-h-[520px] overflow-y-auto px-3 py-3 max-sm:min-h-0 max-sm:flex-1 max-sm:max-h-none max-sm:overscroll-contain">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-sm text-brand-text-muted">
                <CustomSpinner className="size-5 text-brand-primary" />
              </div>
            ) : errorMessage ? (
              <div
                role="alert"
                className="flex flex-col items-center justify-center px-4 py-16 text-center text-sm text-destructive"
              >
                {errorMessage}
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
                <p className="text-sm text-brand-text-muted">{emptyMessage}</p>
                {emptyCreate?.createHint ? (
                  <p className="max-w-sm text-xs text-brand-text-muted">
                    {emptyCreate.createHint}
                  </p>
                ) : null}
                {emptyCreate && trimmedQuery ? (
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleCreate}
                      disabled={!canCreate}
                      className="h-auto gap-1.5 px-2 py-1 text-sm font-medium text-brand-primary underline underline-offset-4 hover:bg-transparent hover:text-brand-primary/80"
                    >
                      {emptyCreate.isPending ? (
                        <CustomSpinner className="size-3.5" />
                      ) : null}
                      Create &ldquo;{trimmedQuery}&rdquo;
                    </Button>
                    {emptyCreate.errorMessage ? (
                      <p role="alert" className="text-sm text-destructive">
                        {emptyCreate.errorMessage}
                      </p>
                    ) : null}
                  </div>
                ) : emptyCreate?.errorMessage ? (
                  <p role="alert" className="text-sm text-destructive">
                    {emptyCreate.errorMessage}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredGroups.map((group) => (
                  <div key={group.id}>
                    <div className="px-4 pt-2 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-text-muted/80">
                      {group.label}
                    </div>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const isSelected = selectedIds.includes(item.id)
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelect(item, group.id)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left transition-colors",
                              isSelected
                                ? "bg-gray-100"
                                : "hover:bg-gray-100/80"
                            )}
                          >
                            <span className="min-w-0 flex-1 pr-4">
                              <span className="block truncate text-[15px] font-medium leading-tight text-brand-text-heading">
                                {item.label}
                              </span>
                              {item.description ? (
                                <span className="mt-0.5 block truncate text-xs text-brand-text-muted">
                                  {item.description}
                                </span>
                              ) : null}
                            </span>
                            {isSelected && (
                              <span className="ml-auto size-2 shrink-0 rounded-full bg-brand-primary" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="h-4 shrink-0" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
