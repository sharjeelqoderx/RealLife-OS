"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"

export type ScheduleBlock = {
  id: string
  dayIndex: number
  startHour: number
  startMinute: number
  durationMinutes: number
  saved?: boolean
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const HOURS_FROM = 0
const HOURS_TO = 23
const HOUR_HEIGHT = 48
const GRID_PADDING_TOP = 52
const GRID_PADDING_LEFT = 72
const DAY_COLUMN_WIDTH = 100

const formatTime = (hour: number, minute: number) => {
  const h = hour % 24
  const m = minute
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

const formatBlockRange = (block: ScheduleBlock) => {
  const startH = block.startHour
  const startM = block.startMinute
  const totalEnd = startH * 60 + startM + block.durationMinutes
  const endH = Math.floor(totalEnd / 60) % 24
  const endM = totalEnd % 60
  return `${formatTime(startH, startM)}—${formatTime(endH, endM)}`
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
    return `sb-${c}-${c * 7919 % 100000}`
  }

  const [blocks, setBlocks] = useState<ScheduleBlock[]>(() => {
    const base = initialBlocks.map((b) => ({
      ...b,
      saved: b.saved ?? true,
    }))
    if (mode === "add" && base.length === 0) {
      return [
        {
          id: "sb-init-001",
          dayIndex: 0,
          startHour: 0,
          startMinute: 30,
          durationMinutes: 30,
          saved: false,
        },
        {
          id: "sb-init-002",
          dayIndex: 1,
          startHour: 0,
          startMinute: 0,
          durationMinutes: 60,
          saved: false,
        },
      ]
    }
    return base
  })

  const dragStateRef = useRef<{
    type: "create" | "resize" | "move" | null
    dayIndex?: number
    startY?: number
    anchorStartMin?: number
    blockId?: string
  }>({ type: null })

  const snapToMinutes = (minutes: number, step = 15) =>
    Math.round(minutes / step) * step

  const yToMinutes = (y: number) => {
    const rel = Math.max(0, y - GRID_PADDING_TOP)
    const rawMinutes = (rel / HOUR_HEIGHT) * 60
    return snapToMinutes(rawMinutes)
  }

  const minutesToY = (totalMinutes: number) => {
    return GRID_PADDING_TOP + (totalMinutes / 60) * HOUR_HEIGHT
  }

  const findDayIndexFromX = (x: number) => {
    const rel = Math.max(0, x - GRID_PADDING_LEFT)
    const idx = Math.floor(rel / DAY_COLUMN_WIDTH)
    return Math.max(0, Math.min(DAYS.length - 1, idx))
  }

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  const handleGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest("[data-schedule-block]")) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const dayIndex = findDayIndexFromX(x)
    const startTotalMin = yToMinutes(y)

    const newBlock: ScheduleBlock = {
      id: nextId(),
      dayIndex,
      startHour: Math.floor(startTotalMin / 60),
      startMinute: startTotalMin % 60,
      durationMinutes: 60,
      saved: false,
    }

    setBlocks((prev) => [...prev, newBlock])
    dragStateRef.current = {
      type: "resize",
      blockId: newBlock.id,
      anchorStartMin: startTotalMin,
      startY: y,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handleGridPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const state = dragStateRef.current

    if (!state.type || !state.blockId) return

    const anchorMin = state.anchorStartMin ?? 0
    const currentMin = yToMinutes(y)
    const diff = currentMin - anchorMin

    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== state.blockId) return b
        const blockStartMin = b.startHour * 60 + b.startMinute
        if (state.type === "resize") {
          let newDuration: number
          if (diff < 0) {
            const newStartTotal = snapToMinutes(
              Math.max(0, blockStartMin + diff)
            )
            const newEnd = blockStartMin + b.durationMinutes
            newDuration = Math.max(15, newEnd - newStartTotal)
            return {
              ...b,
              startHour: Math.floor(newStartTotal / 60),
              startMinute: newStartTotal % 60,
              durationMinutes: newDuration,
              saved: false,
            }
          } else {
            newDuration = Math.max(15, b.durationMinutes + diff)
            const totalEnd = blockStartMin + newDuration
            const clampedEnd = Math.min(HOURS_TO * 60 + 60, totalEnd)
            return {
              ...b,
              durationMinutes: clampedEnd - blockStartMin,
              saved: false,
            }
          }
        }
        return b
      })
    )
  }

  const handleGridPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = { type: null }
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const handleBlockResizeDown = (
    e: React.PointerEvent<HTMLDivElement>,
    block: ScheduleBlock
  ) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement)
      .closest("[data-schedule-grid]")!
      .getBoundingClientRect()
    const startMin = block.startHour * 60 + block.startMinute
    dragStateRef.current = {
      type: "resize",
      blockId: block.id,
      anchorStartMin: startMin + block.durationMinutes,
      startY: e.clientY - rect.top,
    }
    ;(
      (e.currentTarget as HTMLElement).closest(
        "[data-schedule-grid]"
      ) as HTMLElement
    ).setPointerCapture(e.pointerId)
  }

  const handleSave = () => {
    const cleaned = blocks.map((b) => ({ ...b, saved: true }))
    onSave?.(cleaned)
    onOpenChange(false)
  }

  const totalMinutesToEnd = HOURS_TO * 60 + 60
  const gridBodyHeight = (totalMinutesToEnd / 60) * HOUR_HEIGHT

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full max-w-[820px] sm:max-w-[820px] md:max-w-[860px] gap-0 p-0 flex flex-col bg-white"
      >
        <SheetHeader className="px-6 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0 flex-1 space-y-1">
              <SheetTitle className="text-xl font-bold tracking-tight text-brand-text-heading">
                {mode === "edit" ? "Edit Rule Schedule" : "Add Rule Schedule"}
              </SheetTitle>
              <SheetDescription className="text-sm leading-relaxed text-brand-text-muted">
                Click an item to remove it. Click empty space to add a new
                item. Drag to reorder or resize. Click and drag between days.
              </SheetDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="shrink-0 rounded-md p-1.5 text-brand-text-muted transition-colors hover:bg-gray-100 hover:text-brand-text-heading -mt-1 -mr-1"
              aria-label="Close"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div
            data-schedule-grid
            className="relative mx-auto select-none rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden touch-none"
            style={{
              width: GRID_PADDING_LEFT + DAY_COLUMN_WIDTH * DAYS.length + 4,
            }}
            onPointerDown={handleGridPointerDown}
            onPointerMove={handleGridPointerMove}
            onPointerUp={handleGridPointerUp}
          >
            <div
              className="relative"
              style={{
                width: GRID_PADDING_LEFT + DAY_COLUMN_WIDTH * DAYS.length,
                height: GRID_PADDING_TOP + gridBodyHeight,
              }}
            >
              {/* Day headers */}
              <div
                className="absolute left-0 right-0 top-0 z-20 flex border-b border-border/60 bg-white"
                style={{
                  height: GRID_PADDING_TOP,
                  paddingLeft: GRID_PADDING_LEFT,
                }}
              >
                {DAYS.map((day, i) => (
                  <div
                    key={day}
                    className={cn(
                      "flex h-full items-center justify-center text-xs font-semibold text-brand-text-heading border-r border-border/60 last:border-r-0",
                      i === 0 || i === DAYS.length - 1
                        ? "bg-gray-50/60"
                        : "bg-white"
                    )}
                    style={{ width: DAY_COLUMN_WIDTH }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Hour labels + hour rows */}
              {Array.from({ length: HOURS_TO - HOURS_FROM + 1 }).map((_, i) => {
                const hour = HOURS_FROM + i
                const label =
                  hour === 0
                    ? "12 am"
                    : hour < 12
                    ? `${hour} am`
                    : hour === 12
                    ? "12 pm"
                    : `${hour - 12} pm`
                const y = GRID_PADDING_TOP + i * HOUR_HEIGHT
                const isMidnight =
                  hour === 0 || hour === 6 || hour === 12 || hour === 18
                return (
                  <div key={hour}>
                    <div
                      className="absolute left-0 z-10 flex items-center justify-end pr-3 text-xs text-brand-text-muted/90 font-medium"
                      style={{
                        top: y - 6,
                        width: GRID_PADDING_LEFT,
                        height: 16,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      className={cn(
                        "absolute right-0 border-t border-dashed",
                        isMidnight ? "border-border/70" : "border-border/30"
                      )}
                      style={{
                        top: y,
                        left: GRID_PADDING_LEFT,
                      }}
                    />
                  </div>
                )
              })}

              {/* Half-hour dotted lines */}
              {Array.from({ length: HOURS_TO - HOURS_FROM }).map((_, i) => {
                const hour = HOURS_FROM + i
                const y = GRID_PADDING_TOP + (i + 0.5) * HOUR_HEIGHT
                return (
                  <div
                    key={`hh-${hour}`}
                    className="absolute right-0 border-t border-dotted border-border/20"
                    style={{
                      top: y,
                      left: GRID_PADDING_LEFT,
                    }}
                  />
                )
              })}

              {/* Day column dividers + backgrounds */}
              {DAYS.map((_, i) => {
                const isWeekend = i === 0 || i === DAYS.length - 1
                return (
                  <div
                    key={`col-${i}`}
                    className={cn(
                      "absolute top-0 border-r border-border/40 last:border-r-0",
                      isWeekend ? "bg-gray-50/30" : "bg-white"
                    )}
                    style={{
                      left: GRID_PADDING_LEFT + i * DAY_COLUMN_WIDTH,
                      width: DAY_COLUMN_WIDTH,
                      height: GRID_PADDING_TOP + gridBodyHeight,
                    }}
                  />
                )
              })}

              {/* Schedule blocks */}
              {blocks.map((block) => {
                const startTotal = block.startHour * 60 + block.startMinute
                const top = minutesToY(startTotal)
                const height = (block.durationMinutes / 60) * HOUR_HEIGHT
                const left =
                  GRID_PADDING_LEFT + block.dayIndex * DAY_COLUMN_WIDTH + 2
                const width = DAY_COLUMN_WIDTH - 4

                return (
                  <div
                    key={block.id}
                    data-schedule-block
                    onClick={(e) => {
                      e.stopPropagation()
                      removeBlock(block.id)
                    }}
                    className={cn(
                      "absolute z-10 flex flex-col justify-between overflow-hidden rounded-md border border-brand-primary/30 px-2 py-1.5 text-[10px] leading-tight text-brand-primary cursor-pointer transition-colors shadow-sm",
                      block.saved
                        ? "bg-brand-primary/12 hover:bg-red-100 hover:border-red-300 hover:text-red-600"
                        : "bg-brand-primary/8 hover:bg-red-100 hover:border-red-300 hover:text-red-600"
                    )}
                    style={{
                      top,
                      left,
                      width,
                      height: Math.max(22, height - 4),
                    }}
                    title="Click to remove"
                  >
                    <div className="font-mono font-semibold truncate">
                      {formatBlockRange(block)}
                    </div>
                    {!block.saved && (
                      <div className="text-[9px] font-medium text-brand-primary/70 truncate">
                        (not saved)
                      </div>
                    )}
                    <div
                      onPointerDown={(e) => handleBlockResizeDown(e, block)}
                      className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize touch-none"
                      style={{
                        background:
                          "linear-gradient(to bottom, transparent, rgba(1,75,198,0.25))",
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row-reverse items-center justify-between gap-3 px-6 py-4 border-t border-border/50 bg-gray-50/40 m-0">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button size="lg" onClick={handleSave}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
