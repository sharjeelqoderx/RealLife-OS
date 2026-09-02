"use client"

import { useMemo, useRef, useState } from "react"
import { Save, X } from "lucide-react"

import { Button } from "@/components/ui/button"
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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const HOURS_FROM = 0
const HOURS_TO = 23
const HOUR_HEIGHT = 48
const GRID_PADDING_TOP = 52
const GRID_PADDING_LEFT = 72
const DAY_COLUMN_WIDTH = 100
const DRAG_THRESHOLD_PX = 6
const MIN_BLOCK_MINUTES = 15
const DAY_END_MINUTES = HOURS_TO * 60 + 60
const AUTO_SCROLL_EDGE_PX = 56
const AUTO_SCROLL_STEP_PX = 16

type DragType = "create" | "resize-top" | "resize-bottom" | "move" | null

function formatTime(hour: number, minute: number) {
  const h = hour % 24
  return `${h.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
}

function formatBlockRange(block: ScheduleBlock) {
  const startTotal = block.startHour * 60 + block.startMinute
  const endTotal = startTotal + block.durationMinutes
  const endH = Math.floor(endTotal / 60) % 24
  const endM = endTotal % 60
  return `${formatTime(block.startHour, block.startMinute)}\u2014${formatTime(endH, endM)}`
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

function blockStartMinutes(block: ScheduleBlock) {
  return block.startHour * 60 + block.startMinute
}

function blockEndMinutes(block: ScheduleBlock) {
  return blockStartMinutes(block) + block.durationMinutes
}

function minutesToBlockParts(totalMinutes: number) {
  const clamped = Math.max(0, Math.min(DAY_END_MINUTES, totalMinutes))
  return {
    startHour: Math.floor(clamped / 60),
    startMinute: clamped % 60,
  }
}

function snapToMinutes(minutes: number, step = 15) {
  return Math.round(minutes / step) * step
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA
}

function getDayBlocks(
  blocks: ScheduleBlock[],
  dayIndex: number,
  excludeId?: string
) {
  return blocks
    .filter((b) => b.dayIndex === dayIndex && b.id !== excludeId)
    .sort((a, b) => blockStartMinutes(a) - blockStartMinutes(b))
}

function isMinuteInsideBlock(dayIndex: number, minute: number, blocks: ScheduleBlock[]) {
  return getDayBlocks(blocks, dayIndex).some((block) => {
    const start = blockStartMinutes(block)
    return minute >= start && minute < blockEndMinutes(block)
  })
}

function clampBlock(block: ScheduleBlock): ScheduleBlock {
  const startMin = snapToMinutes(blockStartMinutes(block))
  const maxDuration = Math.max(MIN_BLOCK_MINUTES, DAY_END_MINUTES - startMin)
  const durationMinutes = Math.min(
    Math.max(MIN_BLOCK_MINUTES, block.durationMinutes),
    maxDuration
  )
  const { startHour, startMinute } = minutesToBlockParts(startMin)

  return {
    ...block,
    dayIndex: Math.max(0, Math.min(6, block.dayIndex)),
    startHour,
    startMinute,
    durationMinutes,
    saved: false,
  }
}

function constrainMoveBlock(
  block: ScheduleBlock,
  proposedStartMin: number,
  allBlocks: ScheduleBlock[]
): ScheduleBlock {
  const duration = block.durationMinutes
  let start = snapToMinutes(proposedStartMin)
  start = Math.max(0, Math.min(start, DAY_END_MINUTES - duration))

  for (let pass = 0; pass < 4; pass += 1) {
    for (const other of getDayBlocks(allBlocks, block.dayIndex, block.id)) {
      const oStart = blockStartMinutes(other)
      const oEnd = blockEndMinutes(other)

      if (!rangesOverlap(start, start + duration, oStart, oEnd)) continue

      if (proposedStartMin <= oStart) {
        start = Math.min(start, oStart - duration)
      } else {
        start = Math.max(start, oEnd)
      }
    }
    start = Math.max(0, Math.min(start, DAY_END_MINUTES - duration))
  }

  const { startHour, startMinute } = minutesToBlockParts(start)
  return clampBlock({ ...block, startHour, startMinute, durationMinutes: duration })
}

function constrainResizeBottom(
  block: ScheduleBlock,
  proposedEndMin: number,
  allBlocks: ScheduleBlock[]
): ScheduleBlock {
  const start = blockStartMinutes(block)
  let end = snapToMinutes(proposedEndMin)
  end = Math.max(start + MIN_BLOCK_MINUTES, Math.min(end, DAY_END_MINUTES))

  for (const other of getDayBlocks(allBlocks, block.dayIndex, block.id)) {
    const oStart = blockStartMinutes(other)
    if (oStart > start) {
      end = Math.min(end, oStart)
    }
  }

  end = Math.max(start + MIN_BLOCK_MINUTES, end)
  return clampBlock({ ...block, durationMinutes: end - start })
}

function constrainResizeTop(
  block: ScheduleBlock,
  proposedStartMin: number,
  allBlocks: ScheduleBlock[]
): ScheduleBlock {
  const end = blockEndMinutes(block)
  let start = snapToMinutes(proposedStartMin)
  start = Math.max(0, Math.min(start, end - MIN_BLOCK_MINUTES))

  for (const other of getDayBlocks(allBlocks, block.dayIndex, block.id)) {
    const oEnd = blockEndMinutes(other)
    if (oEnd <= end) {
      start = Math.max(start, oEnd)
    }
  }

  start = Math.max(0, Math.min(start, end - MIN_BLOCK_MINUTES))
  const { startHour, startMinute } = minutesToBlockParts(start)
  return clampBlock({
    ...block,
    startHour,
    startMinute,
    durationMinutes: end - start,
  })
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
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const nextId = () => {
    idCounterRef.current += 1
    const c = idCounterRef.current
    return `sb-${c}-${(c * 7919) % 100000}`
  }

  const [blocks, setBlocks] = useState<ScheduleBlock[]>(() =>
    initialBlocks.map((b) => ({ ...b, saved: b.saved ?? true }))
  )
  const [isDragging, setIsDragging] = useState(false)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)

  const dragStateRef = useRef<{
    type: DragType
    blockId?: string
    anchorStartMin?: number
    pointerId?: number
  }>({ type: null })

  const blockPointerRef = useRef<{
    blockId: string
    startX: number
    startY: number
    moved: boolean
    pointerId: number
  } | null>(null)

  const baselineSnapshot = useMemo(
    () => serializeScheduleBlocks(initialBlocks),
    [initialBlocks]
  )
  const currentSnapshot = useMemo(
    () => serializeScheduleBlocks(blocks),
    [blocks]
  )
  const isDirty = currentSnapshot !== baselineSnapshot

  const yToMinutes = (y: number) => {
    const rel = Math.max(0, y - GRID_PADDING_TOP)
    return snapToMinutes((rel / HOUR_HEIGHT) * 60)
  }

  const minutesToY = (totalMinutes: number) =>
    GRID_PADDING_TOP + (totalMinutes / 60) * HOUR_HEIGHT

  const findDayIndexFromX = (x: number) => {
    const rel = Math.max(0, x - GRID_PADDING_LEFT)
    const idx = Math.floor(rel / DAY_COLUMN_WIDTH)
    return Math.max(0, Math.min(DAYS.length - 1, idx))
  }

  const getGridElement = (target: EventTarget | null) =>
    (target as HTMLElement | null)?.closest(
      "[data-schedule-grid]"
    ) as HTMLElement | null

  const autoScrollDuringDrag = (clientY: number) => {
    const container = scrollContainerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    if (clientY < rect.top + AUTO_SCROLL_EDGE_PX) {
      container.scrollTop -= AUTO_SCROLL_STEP_PX
    } else if (clientY > rect.bottom - AUTO_SCROLL_EDGE_PX) {
      container.scrollTop += AUTO_SCROLL_STEP_PX
    }
  }

  const endDrag = (grid: HTMLElement | null, pointerId: number) => {
    dragStateRef.current = { type: null }
    blockPointerRef.current = null
    setIsDragging(false)
    setActiveBlockId(null)

    if (grid) {
      try {
        grid.releasePointerCapture(pointerId)
      } catch {
        /* ignore */
      }
    }
  }

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  const handleGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-schedule-block]")) return
    if (e.button !== 0) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const dayIndex = findDayIndexFromX(x)
    const startTotalMin = yToMinutes(y)

    if (isMinuteInsideBlock(dayIndex, startTotalMin, blocks)) return

    const newBlock: ScheduleBlock = clampBlock({
      id: nextId(),
      dayIndex,
      startHour: Math.floor(startTotalMin / 60),
      startMinute: startTotalMin % 60,
      durationMinutes: 60,
      saved: false,
    })

    setBlocks((prev) => [...prev, newBlock])
    setIsDragging(true)
    setActiveBlockId(newBlock.id)
    dragStateRef.current = {
      type: "resize-bottom",
      blockId: newBlock.id,
      anchorStartMin: startTotalMin,
      pointerId: e.pointerId,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleGridPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    autoScrollDuringDrag(e.clientY)

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const x = e.clientX - rect.left
    const state = dragStateRef.current

    if (!state.type || !state.blockId) return

    if (state.type === "move") {
      const dayIndex = findDayIndexFromX(x)
      const startTotalMin = yToMinutes(y)
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === state.blockId
            ? constrainMoveBlock(
                { ...b, dayIndex },
                startTotalMin,
                prev
              )
            : b
        )
      )
      return
    }

    const currentMin = yToMinutes(y)

    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== state.blockId) return b

        if (state.type === "resize-bottom") {
          return constrainResizeBottom(b, currentMin, prev)
        }

        if (state.type === "resize-top") {
          return constrainResizeTop(b, currentMin, prev)
        }

        if (state.type === "create") {
          const anchorMin = state.anchorStartMin ?? blockStartMinutes(b)
          if (currentMin >= anchorMin) {
            return constrainResizeBottom(b, currentMin, prev)
          }
          return constrainResizeTop(b, currentMin, prev)
        }

        return b
      })
    )
  }

  const handleGridPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const session = blockPointerRef.current
    if (session?.pointerId === e.pointerId && !session.moved) {
      removeBlock(session.blockId)
    }

    endDrag(e.currentTarget, e.pointerId)
  }

  const handleBlockPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    block: ScheduleBlock
  ) => {
    if ((e.target as HTMLElement).closest("[data-resize-handle]")) return
    if (e.button !== 0) return

    e.stopPropagation()
    const grid = getGridElement(e.currentTarget)
    if (!grid) return

    blockPointerRef.current = {
      blockId: block.id,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      pointerId: e.pointerId,
    }
    setActiveBlockId(block.id)
    grid.setPointerCapture(e.pointerId)
  }

  const handleBlockPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const session = blockPointerRef.current
    if (!session || session.pointerId !== e.pointerId) return

    autoScrollDuringDrag(e.clientY)

    const dx = e.clientX - session.startX
    const dy = e.clientY - session.startY
    if (!session.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return

    session.moved = true
    setIsDragging(true)
    dragStateRef.current = {
      type: "move",
      blockId: session.blockId,
      pointerId: e.pointerId,
    }

    const grid = getGridElement(e.currentTarget)
    if (!grid) return

    const rect = grid.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const dayIndex = findDayIndexFromX(x)
    const startTotalMin = yToMinutes(y)

    setBlocks((prev) =>
      prev.map((b) =>
        b.id === session.blockId
          ? constrainMoveBlock({ ...b, dayIndex }, startTotalMin, prev)
          : b
      )
    )
  }

  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    block: ScheduleBlock,
    edge: "top" | "bottom"
  ) => {
    e.stopPropagation()
    const grid = getGridElement(e.currentTarget)
    if (!grid) return

    blockPointerRef.current = null
    setIsDragging(true)
    setActiveBlockId(block.id)
    dragStateRef.current = {
      type: edge === "top" ? "resize-top" : "resize-bottom",
      blockId: block.id,
      anchorStartMin:
        edge === "top"
          ? blockStartMinutes(block)
          : blockEndMinutes(block),
      pointerId: e.pointerId,
    }
    grid.setPointerCapture(e.pointerId)
  }

  const handleSave = () => {
    onSave?.(blocks.map((b) => ({ ...b, saved: true })))
    onOpenChange(false)
  }

  const totalMinutesToEnd = DAY_END_MINUTES
  const gridBodyHeight = (totalMinutesToEnd / 60) * HOUR_HEIGHT

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "flex max-h-[100svh] min-h-0 flex-col gap-0 overflow-hidden bg-white p-0",
          "data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:max-h-[100svh]",
          "data-[side=right]:!max-w-none sm:data-[side=right]:!max-w-none",
          "max-lg:data-[side=right]:!w-full max-lg:data-[side=right]:left-0",
          "lg:data-[side=right]:left-auto lg:data-[side=right]:!w-1/2 lg:data-[side=right]:!max-w-[50vw]",
          "max-sm:data-[side=right]:inset-y-3 max-sm:data-[side=right]:right-3 max-sm:data-[side=right]:left-3 max-sm:data-[side=right]:h-[calc(100svh-1.5rem)] max-sm:data-[side=right]:max-h-[calc(100svh-1.5rem)] max-sm:data-[side=right]:!w-auto max-sm:data-[side=right]:rounded-2xl max-sm:data-[side=right]:border max-sm:data-[side=right]:border-border/60"
        )}
      >
        <SheetHeader className="shrink-0 space-y-0 border-b border-border/50 px-6 py-5 text-left max-sm:px-4 max-sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <SheetTitle className="text-xl font-bold tracking-tight text-brand-text-heading max-sm:text-lg">
                {mode === "edit" ? "Edit Rule Schedule" : "Add Rule Schedule"}
              </SheetTitle>
              <SheetDescription className="text-sm leading-relaxed text-brand-text-muted">
                Click empty space to add. Click a block to remove. Drag a block
                to move between days. Use top or bottom edge to stretch.
              </SheetDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="-mr-1 -mt-1 shrink-0 rounded-md p-1.5 text-brand-text-muted transition-colors hover:bg-gray-100 hover:text-brand-text-heading"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </SheetHeader>

        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain px-6 py-5 max-sm:px-4"
        >
          <div
            data-schedule-grid
            className={cn(
              "relative mx-auto select-none overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm",
              isDragging && "touch-none"
            )}
            style={{
              width: GRID_PADDING_LEFT + DAY_COLUMN_WIDTH * DAYS.length + 4,
            }}
            onPointerDown={handleGridPointerDown}
            onPointerMove={(e) => {
              handleGridPointerMove(e)
              handleBlockPointerMove(e)
            }}
            onPointerUp={handleGridPointerUp}
            onPointerCancel={handleGridPointerUp}
          >
            <div
              className="relative"
              style={{
                width: GRID_PADDING_LEFT + DAY_COLUMN_WIDTH * DAYS.length,
                height: GRID_PADDING_TOP + gridBodyHeight,
              }}
            >
              <div
                className="absolute left-0 right-0 top-0 z-30 flex border-b border-border/60 bg-white"
                style={{
                  height: GRID_PADDING_TOP,
                  paddingLeft: GRID_PADDING_LEFT,
                }}
              >
                {DAYS.map((day, i) => (
                  <div
                    key={day}
                    className={cn(
                      "flex h-full items-center justify-center border-r border-border/60 text-xs font-semibold text-brand-text-heading last:border-r-0",
                      i === 0 || i === 6 ? "bg-gray-50/60" : "bg-white"
                    )}
                    style={{ width: DAY_COLUMN_WIDTH }}
                  >
                    {day}
                  </div>
                ))}
              </div>

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
                      className="absolute left-0 z-10 flex items-center justify-end bg-white pr-3 text-xs font-medium text-brand-text-muted/90"
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
                      style={{ top: y, left: GRID_PADDING_LEFT }}
                    />
                  </div>
                )
              })}

              {Array.from({ length: HOURS_TO - HOURS_FROM }).map((_, i) => {
                const hour = HOURS_FROM + i
                const y = GRID_PADDING_TOP + (i + 0.5) * HOUR_HEIGHT
                return (
                  <div
                    key={`hh-${hour}`}
                    className="absolute right-0 border-t border-dotted border-border/20"
                    style={{ top: y, left: GRID_PADDING_LEFT }}
                  />
                )
              })}

              {DAYS.map((_, i) => {
                const isWeekend = i === 0 || i === 6
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

              {blocks.map((block) => {
                const startTotal = blockStartMinutes(block)
                const top = minutesToY(startTotal)
                const height = (block.durationMinutes / 60) * HOUR_HEIGHT
                const left =
                  GRID_PADDING_LEFT + block.dayIndex * DAY_COLUMN_WIDTH + 2
                const width = DAY_COLUMN_WIDTH - 4
                const isActive = activeBlockId === block.id

                return (
                  <div
                    key={block.id}
                    data-schedule-block
                    onPointerDown={(e) => handleBlockPointerDown(e, block)}
                    className={cn(
                      "absolute flex cursor-grab flex-col justify-between overflow-hidden rounded-md border border-gray-300 bg-gray-100 px-2 py-1.5 text-[10px] leading-tight text-brand-text-heading shadow-sm active:cursor-grabbing",
                      !block.saved && "border-gray-400/80",
                      isActive ? "z-20 ring-2 ring-brand-primary/30" : "z-10"
                    )}
                    style={{
                      top,
                      left,
                      width,
                      height: Math.max(28, height - 2),
                    }}
                    title="Click to remove, drag to move, stretch from edges"
                  >
                    <div
                      data-resize-handle
                      onPointerDown={(e) =>
                        handleResizePointerDown(e, block, "top")
                      }
                      className="absolute inset-x-0 top-0 z-10 h-2.5 cursor-ns-resize touch-none bg-gradient-to-b from-gray-400/35 to-transparent"
                    />
                    <div className="pointer-events-none truncate pt-1 font-mono font-semibold">
                      {formatBlockRange(block)}
                    </div>
                    {!block.saved ? (
                      <div className="pointer-events-none truncate text-[9px] font-medium text-brand-text-muted">
                        (not saved)
                      </div>
                    ) : null}
                    <div
                      data-resize-handle
                      onPointerDown={(e) =>
                        handleResizePointerDown(e, block, "bottom")
                      }
                      className="absolute inset-x-0 bottom-0 z-10 h-2.5 cursor-ns-resize touch-none bg-gradient-to-t from-gray-400/35 to-transparent"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <SheetFooter className="m-0 shrink-0 flex-row items-center justify-end gap-3 border-t border-border/50 bg-gray-50/40 px-6 py-4 sm:flex-row sm:space-x-0 max-sm:px-4 max-sm:py-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 bg-white px-6 text-sm font-semibold hover:bg-gray-100"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={!isDirty}
            onClick={handleSave}
            className="h-11 gap-2 px-6 text-sm font-semibold shadow-md shadow-brand-primary/20"
          >
            <Save className="size-4" />
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
