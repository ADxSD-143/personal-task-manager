import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfISOWeek,
} from 'date-fns'

export const DATE_KEY = 'yyyy-MM-dd'

export const todayKey = (): string => format(new Date(), DATE_KEY)

export const toKey = (value: Date | string): string =>
  typeof value === 'string' ? format(parseISO(value), DATE_KEY) : format(value, DATE_KEY)

/** Inclusive list of the last `n` day keys, oldest first, ending today. */
export const lastNDays = (n: number, from: Date = new Date()): string[] => {
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i -= 1) {
    keys.push(format(addDays(from, -i), DATE_KEY))
  }
  return keys
}

export const isoWeekKey = (value: Date | string): string => {
  const date = typeof value === 'string' ? parseISO(value) : value
  return format(startOfISOWeek(date), "RRRR-'W'II")
}

export const formatDate = (key: string | null | undefined): string => {
  if (!key) return '—'
  const parsed = parseISO(key)
  if (Number.isNaN(parsed.getTime())) return '—'
  return format(parsed, 'MMM d, yyyy')
}

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const parsed = parseISO(iso)
  if (Number.isNaN(parsed.getTime())) return '—'
  return format(parsed, 'MMM d, yyyy · h:mm a')
}

export const relativeDay = (key: string | null | undefined): string => {
  if (!key) return '—'
  const diff = differenceInCalendarDays(parseISO(key), new Date())
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1 && diff <= 7) return `In ${diff} days`
  if (diff < -1 && diff >= -7) return `${Math.abs(diff)} days ago`
  return formatDate(key)
}

export const formatDuration = (minutes: number): string => {
  if (!minutes) return '0m'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}
