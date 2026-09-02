import type { ScheduleBlock } from "@/app/(protected)/content-policies/(editor)/_components/schedule-sheet"

export const SCHEDULE_DAYS = [
  { index: 0, label: "Sunday" },
  { index: 1, label: "Monday" },
  { index: 2, label: "Tuesday" },
  { index: 3, label: "Wednesday" },
  { index: 4, label: "Thursday" },
  { index: 5, label: "Friday" },
  { index: 6, label: "Saturday" },
] as const

export const SCHEDULE_TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const total = i * 15
  const hour = Math.floor(total / 60)
  const minute = total % 60
  return {
    value: `${hour}:${minute}`,
    minutes: total,
    label: formatScheduleClock(hour, minute),
  }
})

export function formatScheduleClock(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  const suffix = hour < 12 ? "AM" : "PM"
  return `${h12}:${minute.toString().padStart(2, "0")} ${suffix}`
}

export function parseScheduleTimeValue(value: string): {
  hour: number
  minute: number
  minutes: number
} {
  const [h, m] = value.split(":").map(Number)
  const hour = h ?? 0
  const minute = m ?? 0
  return { hour, minute, minutes: hour * 60 + minute }
}

export function scheduleStartValue(block: ScheduleBlock): string {
  return `${block.startHour}:${block.startMinute}`
}

export function scheduleEndValue(block: ScheduleBlock): string {
  const endMinutes = block.startHour * 60 + block.startMinute + block.durationMinutes
  const hour = Math.floor(endMinutes / 60) % 24
  const minute = endMinutes % 60
  return `${hour}:${minute}`
}

export function validateScheduleBlock(block: ScheduleBlock): string | null {
  if (block.dayIndex < 0 || block.dayIndex > 6) {
    return "Choose a valid day"
  }
  if (block.durationMinutes < 15) {
    return "End time must be at least 15 minutes after start"
  }
  if (block.durationMinutes > 24 * 60) {
    return "Schedule cannot be longer than 24 hours"
  }
  return null
}

export function formatScheduleBlockLabel(block: ScheduleBlock): string {
  const day =
    SCHEDULE_DAYS.find((d) => d.index === block.dayIndex)?.label ?? "Day"
  const endMinutes = block.startHour * 60 + block.startMinute + block.durationMinutes
  const endHour = Math.floor(endMinutes / 60) % 24
  const endMinute = endMinutes % 60
  return `${day}, ${formatScheduleClock(block.startHour, block.startMinute)} – ${formatScheduleClock(endHour, endMinute)}`
}

export function createDefaultScheduleBlock(id: string): ScheduleBlock {
  return {
    id,
    dayIndex: 1,
    startHour: 9,
    startMinute: 0,
    durationMinutes: 8 * 60,
    saved: false,
  }
}
