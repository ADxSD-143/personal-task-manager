import { addDays, format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { dailyStreak, habitLongestStreak, habitStreak, longestDailyStreak, weeklyStreak } from '@/lib/streak'
import type { Habit } from '@/types'

const key = (offset: number): string => format(addDays(new Date(), offset), 'yyyy-MM-dd')

const habit = (overrides: Partial<Habit>): Habit => ({
  id: 'h1',
  name: 'Test habit',
  description: '',
  color: '#6366f1',
  frequency: 'daily',
  targetPerPeriod: 1,
  completions: [],
  createdAt: new Date().toISOString(),
  ...overrides,
})

describe('dailyStreak', () => {
  it('counts consecutive days including today', () => {
    expect(dailyStreak([key(0), key(-1), key(-2)])).toBe(3)
  })

  it('stays alive when today has not been logged yet', () => {
    expect(dailyStreak([key(-1), key(-2)])).toBe(2)
  })

  it('breaks on a gap', () => {
    expect(dailyStreak([key(0), key(-1), key(-3)])).toBe(2)
  })

  it('returns 0 when the most recent log is older than yesterday', () => {
    expect(dailyStreak([key(-3), key(-4)])).toBe(0)
  })

  it('ignores duplicate dates', () => {
    expect(dailyStreak([key(0), key(0), key(-1)])).toBe(2)
  })

  it('returns 0 for no completions', () => {
    expect(dailyStreak([])).toBe(0)
  })
})

describe('longestDailyStreak', () => {
  it('finds the best run even if it is not the current one', () => {
    expect(longestDailyStreak([key(-10), key(-9), key(-8), key(-1)])).toBe(3)
  })

  it('returns 1 for a single completion', () => {
    expect(longestDailyStreak([key(-5)])).toBe(1)
  })
})

describe('weeklyStreak', () => {
  it('counts consecutive weeks that reach the target', () => {
    const dates = [
      format(new Date(), 'yyyy-MM-dd'),
      format(addDays(new Date(), -1), 'yyyy-MM-dd'),
      format(addDays(new Date(), -7), 'yyyy-MM-dd'),
      format(addDays(new Date(), -8), 'yyyy-MM-dd'),
    ]
    // 2 this week and 2 last week, target of 2 => 2 week streak
    expect(weeklyStreak(dates, 2)).toBe(2)
  })

  it('returns 0 when the target has never been met', () => {
    expect(weeklyStreak([key(0)], 3)).toBe(0)
  })

  it('returns 0 for a non-positive target', () => {
    expect(weeklyStreak([key(0)], 0)).toBe(0)
  })
})

describe('habit helpers', () => {
  it('uses the daily algorithm for daily habits', () => {
    expect(habitStreak(habit({ completions: [key(0), key(-1)] }))).toBe(2)
  })

  it('uses the weekly algorithm for weekly habits', () => {
    const weekly = habit({
      frequency: 'weekly',
      targetPerPeriod: 2,
      completions: [key(0), key(-1), key(-7), key(-8)],
    })
    expect(habitStreak(weekly)).toBe(2)
    expect(habitLongestStreak(weekly)).toBe(2)
  })
})
