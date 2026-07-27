"use client"

import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface PoliciesMultiSelectFilterProps<T extends string> {
  label: string
  options: { value: T; label: string }[]
  selected: T[]
  count: number
  onChange: (selected: T[]) => void
  className?: string
}

export function PoliciesMultiSelectFilter<T extends string>({
  label,
  options,
  selected,
  count,
  onChange,
  className,
}: PoliciesMultiSelectFilterProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-11 min-w-[8.5rem] justify-between gap-3 border-border bg-brand-surface px-3 text-xs font-medium text-brand-text-heading",
            className
          )}
        >
          <span className="truncate text-left">{label}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="tabular-nums text-brand-text-muted">{count}</span>
            <ChevronDown className="size-3.5 text-brand-text-muted" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onCheckedChange={(checked) => {
              onChange(
                checked
                  ? [...selected, option.value]
                  : selected.filter((value) => value !== option.value)
              )
            }}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
