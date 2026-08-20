"use client"

import { useMemo, useRef, useState } from "react"
import { CalendarDays, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export type ScheduleBlock = {
  id: string
  dayIndex: number
  startHour: number
  startMinute: number
  durationMinutes: number
  saved?: boolean
}

const DAYS = [
  { index: 0, short: "Sun", full: "Sunday" },
  { index: 1, short: "Mon", full: "Monday" },
  { index: 2, short: "Tue", full: "Tuesday" },
  { index: 3, short: "Wed", full: "Wednesday" },
  { index: 4, short: "Thu", full: "Thursday" },
  { index: 5, short: "Fri", full: "Friday" },
  { index: 6, short: "Sat", full: "Saturday" },
] as const

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const total = i * 15
  const hour = Math.floor(total / 60)
  const minute = total % 60
  return {
    value: `${hour}:${minute}`,
    minutes: total,
    label: formatClock(hour, minute),
  }
})

function formatClock(hour: number, minute: number) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  const suffix = hour < 12 ? "AM" : "PM"
  return `${h12}:${minute.toString().padStart(2, "0")} ${suffix}`
}

function formatBlockRange(block: ScheduleBlock) {
  const start = block.startHour * 60 + block.startMinute
  const end = start + block.durationMinutes
  const endH = Math.floor(end / 60) % 24
  const endM = end % 60
  return `${formatClock(block.startHour, block.startMinute)} – ${formatClock(endH, endM)}`
}

function serializeScheduleBlocks(blocks: ScheduleBlock[]): string {
  return JSON.stringify(
    [...blocks]
      .map((b) => ({
        dayIndex: b.dayIndex,
        startHour: b.startHour,
        startMinute: b.startMinute,
        durationMinutes: b.durationMinutes,
      }))
      .sort(
        (a, b) =>
          a.dayIndex - b.dayIndex ||
          a.startHour - b.startHour ||
          a.startMinute - b.startMinute ||
          a.durationMinutes - b.durationMinutes
      )
  )
}

function parseTimeValue(value: string) {
  const [h, m] = value.split(":").map(Number)
  return { hour: h ?? 0, minute: m ?? 0, minutes: (h ?? 0) * 60 + (m ?? 0) }
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "edit"
  initialBlocks?: ScheduleBlock[]
  onSave?: (blocks: ScheduleBlock[]) => void
}

export function ScheduleSheet({
  open,
  onOpenChange,
  mode,
  initialBlocks = [],
  onSave,
}: Props) {
  const idCounterRef = useRef(0)
  const nextId = () => {
    idCounterRef.current += 1
    const c = idCounterRef.current
    return `sb-${c}-${(c * 7919) % 100000}`
  }

  const [blocks, setBlocks] = useState<ScheduleBlock[]>(() =>
    initialBlocks.map((b) => ({ ...b, saved: b.saved ?? true }))
  )
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [startTime, setStartTime] = useState("8:0")
  const [endTime, setEndTime] = useState("17:0")
  const [formError, setFormError] = useState("")

  const baselineSnapshot = useMemo(
    () => serializeScheduleBlocks(initialBlocks),
    [initialBlocks]
  )
  const currentSnapshot = useMemo(
    () => serializeScheduleBlocks(blocks),
    [blocks]
  )
  const isDirty = currentSnapshot !== baselineSnapshot
  const canSaveSchedule = isDirty

  const blocksByDay = useMemo(() => {
    const map: Record<number, ScheduleBlock[]> = {}
    for (const day of DAYS) map[day.index] = []
    for (const block of blocks) {
      map[block.dayIndex] = [...(map[block.dayIndex] ?? []), block]
    }
    for (const day of DAYS) {
      map[day.index] = (map[day.index] ?? []).sort(
        (a, b) =>
          a.startHour * 60 +
          a.startMinute -
          (b.startHour * 60 + b.startMinute)
      )
    }
    return map
  }, [blocks])

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    )
  }

  const addBlocks = () => {
    if (selectedDays.length === 0) {
      setFormError("Select at least one day")
      return
    }

    const start = parseTimeValue(startTime)
    const end = parseTimeValue(endTime)

    if (end.minutes <= start.minutes) {
      setFormError("End time must be after start time")
      return
    }

    setFormError("")
    const durationMinutes = end.minutes - start.minutes
    const next = selectedDays.map((dayIndex) => ({
      id: nextId(),
      dayIndex,
      startHour: start.hour,
      startMinute: start.minute,
      durationMinutes,
      saved: false,
    }))
    setBlocks((prev) => [...prev, ...next])
  }

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  const clearAll = () => setBlocks([])

  const applyWeekdays = () => {
    setSelectedDays([1, 2, 3, 4, 5])
    setStartTime("8:0")
    setEndTime("17:0")
    setFormError("")
    setBlocks(
      [1, 2, 3, 4, 5].map((dayIndex) => ({
        id: nextId(),
        dayIndex,
        startHour: 8,
        startMinute: 0,
        durationMinutes: 9 * 60,
        saved: false,
      }))
    )
  }

  const applyEveryNight = () => {
    setSelectedDays([0, 1, 2, 3, 4, 5, 6])
    setStartTime("21:0")
    setEndTime("23:45")
    setFormError("")
    setBlocks(
      [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => ({
        id: nextId(),
        dayIndex,
        startHour: 21,
        startMinute: 0,
        durationMinutes: 165,
        saved: false,
      }))
    )
  }

  const handleSave = () => {
    onSave?.(blocks.map((b) => ({ ...b, saved: true })))
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "flex h-full min-h-0 w-full flex-col gap-0 overflow-hidden bg-brand-surface p-0",
          "data-[side=right]:w-[min(100vw,560px)] data-[side=right]:max-w-[min(100vw,560px)]",
          // Phone only: inset + fixed height for scroll
          "max-sm:data-[side=right]:inset-y-3 max-sm:data-[side=right]:right-3 max-sm:data-[side=right]:left-3 max-sm:data-[side=right]:h-[calc(100svh-1.5rem)] max-sm:data-[side=right]:max-h-[calc(100svh-1.5rem)] max-sm:data-[side=right]:w-auto max-sm:data-[side=right]:max-w-none max-sm:data-[side=right]:rounded-2xl max-sm:data-[side=right]:border max-sm:data-[side=right]:border-border/60"
        )}
      >
        <SheetHeader className="shrink-0 space-y-0 border-b border-border/60 px-6 py-5 text-left max-sm:px-4 max-sm:py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <SheetTitle className="text-xl font-bold tracking-tight text-brand-text-heading max-sm:text-lg">
                {mode === "edit" ? "Edit Rule Schedule" : "Add Rule Schedule"}
              </SheetTitle>
              <SheetDescription className="text-sm leading-relaxed text-brand-text-muted">
                Choose days and a time range when this rule should be active.
              </SheetDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="shrink-0 rounded-md p-1.5 text-brand-text-muted transition-colors hover:bg-muted hover:text-brand-text-heading"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-5 max-sm:px-4">
          {/* Quick presets */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="brandOutline"
              size="sm"
              className="h-8"
              onClick={applyWeekdays}
            >
              Weekdays 8am–5pm
            </Button>
            <Button
              type="button"
              variant="brandOutline"
              size="sm"
              className="h-8"
              onClick={applyEveryNight}
            >
              Every night 9pm–11:45pm
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-brand-text-muted"
              onClick={clearAll}
              disabled={blocks.length === 0}
            >
              Clear all
            </Button>
          </div>

          {/* Days */}
          <div className="space-y-2.5">
            <Label className="text-sm font-semibold text-brand-text-heading">
              Days
            </Label>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map((day) => {
                const active = selectedDays.includes(day.index)
                return (
                  <button
                    key={day.index}
                    type="button"
                    onClick={() => toggleDay(day.index)}
                    className={cn(
                      "flex h-11 flex-col items-center justify-center rounded-md border text-xs font-semibold transition-colors",
                      active
                        ? "border-brand-primary bg-brand-primary text-brand-primary-foreground"
                        : "border-border/70 bg-white text-brand-text-heading hover:border-brand-primary/40 hover:bg-brand-primary/5"
                    )}
                    aria-pressed={active}
                  >
                    {day.short}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label
                htmlFor="schedule-start"
                className="text-sm font-semibold text-brand-text-heading"
              >
                Start time
              </Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger id="schedule-start" className="w-full">
                  <SelectValue placeholder="Start" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem key={`start-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="schedule-end"
                className="text-sm font-semibold text-brand-text-heading"
              >
                End time
              </Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger id="schedule-end" className="w-full">
                  <SelectValue placeholder="End" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem key={`end-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formError ? (
            <p className="text-sm text-destructive">{formError}</p>
          ) : null}

          <Button
            type="button"
            variant="brandOutline"
            className="h-10 w-full gap-1.5"
            onClick={addBlocks}
          >
            <Plus className="size-4" />
            Add to schedule
          </Button>

          {/* Weekly summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-brand-text-heading">
                This week
              </h3>
              <span className="text-xs text-brand-text-muted">
                {blocks.length} block{blocks.length === 1 ? "" : "s"}
              </span>
            </div>

            {blocks.length === 0 ? (
              <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-white px-4 py-8 text-center">
                <CalendarDays className="mb-3 size-8 text-brand-text-muted/70" />
                <p className="text-sm font-semibold text-brand-text-heading">
                  No schedule yet
                </p>
                <p className="mt-1 max-w-xs text-sm text-brand-text-muted">
                  Pick days and times above, or use a quick preset.
                </p>
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-border/70 bg-white p-2">
                {DAYS.map((day) => {
                  const dayBlocks = blocksByDay[day.index] ?? []
                  if (dayBlocks.length === 0) return null
                  return (
                    <div
                      key={day.index}
                      className="rounded-md border border-border/50 bg-muted/20 px-3 py-2.5"
                    >
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-text-muted">
                        {day.full}
                      </p>
                      <div className="space-y-1.5">
                        {dayBlocks.map((block) => (
                          <div
                            key={block.id}
                            className="flex items-center justify-between gap-3 rounded-md border border-brand-primary/20 bg-brand-primary/[0.06] px-3 py-2"
                          >
                            <span className="text-sm font-medium text-brand-text-heading">
                              {formatBlockRange(block)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeBlock(block.id)}
                              className="rounded-md p-1.5 text-brand-text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`Remove ${day.full} block`}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="m-0 shrink-0 flex-row items-center justify-end gap-3 border-t border-border/60 bg-muted/30 px-6 py-4 sm:flex-row sm:space-x-0 max-sm:px-4 max-sm:py-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={!canSaveSchedule}
            onClick={handleSave}
          >
            Save schedule
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
