import { addDays, parseISO, startOfISOWeek } from 'date-fns'
import type { Habit } from '@/types'
import { isoWeekKey, toKey, todayKey } from './date'

const uniq = (values: string[]): string[] => Array.from(new Set(values)).sort()

/**
 * Current daily streak. A streak stays alive through today even if today has
 * not been logged yet (we then measure back from yesterday).
 */
export const dailyStreak = (dates: string[], today: Date = new Date()): number => {
  const set = new Set(uniq(dates))
  if (set.size === 0) return 0

  const todayStr = toKey(today)
  let cursor = set.has(todayStr) ? today : addDays(today, -1)
  let streak = 0

  while (set.has(toKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export const longestDailyStreak = (dates: string[]): number => {
  const sorted = uniq(dates)
  if (sorted.length === 0) return 0

  let best = 1
  let current = 1
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = parseISO(sorted[i - 1])
    const curr = parseISO(sorted[i])
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000)
    if (diff === 1) {
      current += 1
      best = Math.max(best, current)
    } else if (diff > 1) {
      current = 1
    }
  }
  return best
}

/** Consecutive ISO weeks (ending this week or last week) that hit the weekly target. */
export const weeklyStreak = (
  dates: string[],
  target: number,
  today: Date = new Date()
): number => {
  if (target <= 0) return 0
  const counts = new Map<string, number>()
  uniq(dates).forEach((d) => {
    const key = isoWeekKey(d)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })
  if (counts.size === 0) return 0

  const met = (weekStart: Date): boolean => (counts.get(isoWeekKey(weekStart)) ?? 0) >= target

  const thisWeek = startOfISOWeek(today)
  let cursor = met(thisWeek) ? thisWeek : addDays(thisWeek, -7)
  let streak = 0
  while (met(cursor)) {
    streak += 1
    cursor = addDays(cursor, -7)
  }
  return streak
}

export const habitStreak = (habit: Habit, today: Date = new Date()): number =>
  habit.frequency === 'weekly'
    ? weeklyStreak(habit.completions, habit.targetPerPeriod, today)
    : dailyStreak(habit.completions, today)

export const habitLongestStreak = (habit: Habit): number => {
  if (habit.frequency === 'weekly') {
    const counts = new Map<string, number>()
    uniq(habit.completions).forEach((d) => {
      const key = isoWeekKey(d)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    const weeks = Array.from(counts.entries())
      .filter(([, c]) => c >= habit.targetPerPeriod)
      .map(([w]) => w)
      .sort()
    let best = 0
    let current = 0
    let prev: string | null = null
    weeks.forEach((w) => {
      if (prev === null) {
        current = 1
      } else {
        const prevDate = parseISO(`${prev}-1`)
        const expected = isoWeekKey(addDays(prevDate, 7))
        current = expected === w ? current + 1 : 1
      }
      best = Math.max(best, current)
      prev = w
    })
    return best
  }
  return longestDailyStreak(habit.completions)
}

export const habitRateLastNDays = (habit: Habit, days: string[]): number => {
  if (days.length === 0) return 0
  const set = new Set(habit.completions)
  const hits = days.filter((d) => set.has(d)).length
  if (habit.frequency === 'weekly') {
    const weeks = Math.max(1, days.length / 7)
    const expected = habit.targetPerPeriod * weeks
    return Math.min(100, Math.round((hits / expected) * 100))
  }
  return Math.round((hits / days.length) * 100)
}

export const isCompletedToday = (habit: Habit, today: string = todayKey()): boolean =>
  habit.completions.includes(today)
