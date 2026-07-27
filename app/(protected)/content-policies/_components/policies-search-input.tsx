"use client"

import { Search } from "lucide-react"
import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"
import { updatePolicyListUrlParam } from "@/lib/content-policies/list-params"
import { cn } from "@/lib/utils"

const SEARCH_DEBOUNCE_MS = 300

export interface PoliciesSearchInputProps {
  searchQuery: string
  onQueryChange: (query: string) => void
  className?: string
}

export function PoliciesSearchInput({
  searchQuery,
  onQueryChange,
  className,
}: PoliciesSearchInputProps) {
  const [inputValue, setInputValue] = useState(searchQuery)

  useEffect(() => {
    setInputValue(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onQueryChange(inputValue)

      const nextQuery = inputValue.trim()
      updatePolicyListUrlParam("q", nextQuery || undefined)
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [inputValue, onQueryChange])

  return (
    <div className={cn("relative w-full max-w-md", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-brand-text-muted" />
      <Input
        type="search"
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        placeholder="Search policies..."
        className="h-11 border-border bg-brand-surface px-3 py-0 pl-9 text-xs font-medium md:text-xs"
      />
    </div>
  )
}
