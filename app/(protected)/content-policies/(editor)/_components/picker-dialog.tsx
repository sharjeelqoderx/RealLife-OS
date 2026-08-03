"use client"

import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type PickerGroup<T extends string> = {
  id: T
  label: string
  items: { id: string; label: string }[]
}

type Props<TGroupId extends string> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  searchPlaceholder: string
  groups: PickerGroup<TGroupId>[]
  selectedIds?: string[]
  onSelect?: (item: { id: string; label: string; groupId: TGroupId }) => void
}

export function PickerDialog<TGroupId extends string>({
  open,
  onOpenChange,
  searchPlaceholder,
  groups,
  selectedIds = [],
  onSelect,
}: Props<TGroupId>) {
  const [query, setQuery] = useState("")

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return groups
      .map((g) => ({
        ...g,
        items: q
          ? g.items.filter((i) => i.label.toLowerCase().includes(q))
          : g.items,
      }))
      .filter((g) => g.items.length > 0)
  }, [query, groups])

  const handleSelect = (
    item: { id: string; label: string },
    groupId: TGroupId
  ) => {
    onSelect?.({ ...item, groupId })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[92vw] max-w-[620px] p-0 gap-0 sm:max-w-[620px] bg-white rounded-[20px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] ring-0 border-0"
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-5">
          <div className="flex flex-1 items-center gap-3">
            <Search className="size-5 shrink-0 text-brand-text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 border-0 bg-transparent px-0 text-base placeholder:text-brand-text-placeholder text-brand-text-heading focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
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

        <div className="h-px bg-border/60 mx-6" />

        {/* Grouped list */}
        <div className="max-h-[520px] overflow-y-auto px-3 py-3">
          {filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center text-sm text-brand-text-muted">
              No results.
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
                            "flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-[15px] font-medium leading-tight text-brand-text-heading transition-colors",
                            isSelected
                              ? "bg-gray-100"
                              : "hover:bg-gray-100/80"
                          )}
                        >
                          <span className="truncate pr-4">{item.label}</span>
                          {isSelected && (
                            <span className="ml-auto shrink-0 rounded-full size-2 bg-brand-primary" />
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
        <div className="h-4" />
      </DialogContent>
    </Dialog>
  )
}
