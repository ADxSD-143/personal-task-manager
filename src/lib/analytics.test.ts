import { describe, expect, it } from 'vitest'
import {
  courseStats,
  dayStats,
  goalProgress,
  learningTotals,
  leetcodeStats,
  nextIncompleteDay,
  nextIncompleteLesson,
  taskStats,
} from '@/lib/analytics'
import type { Course, Goal, LeetCodeRecord, Task } from '@/types'
import { format, addDays } from 'date-fns'

const video = (id: string, duration: number, completed: boolean) => ({
  id,
  title: `Video ${id}`,
  url: '',
  duration,
  completed,
  completedAt: completed ? new Date().toISOString() : null,
})

const course = (): Course => ({
  id: 'c1',
  title: 'Machine Learning',
  description: '',
  category: 'AI',
  color: '#6366f1',
  createdAt: new Date().toISOString(),
  days: [
    {
      id: 'd1',
      title: 'Intro',
      description: '',
      order: 1,
      videos: [video('v1', 10, true), video('v2', 20, false)],
      codeFiles: [],
    },
    {
      id: 'd2',
      title: 'Regression',
      description: '',
      order: 2,
      videos: [video('v3', 30, false), video('v4', 40, false)],
      codeFiles: [{ id: 'f1', name: 'a.py', language: 'python', content: '', updatedAt: '' }],
    },
  ],
})

const task = (overrides: Partial<Task>): Task => ({
  id: 't1',
  title: 'Task',
  description: '',
  completed: false,
  priority: 'medium',
  tags: [],
  dueDate: null,
  goalIds: [],
  projectId: null,
  createdAt: new Date().toISOString(),
  completedAt: null,
  ...overrides,
})

describe('course statistics', () => {
  it('computes progress, watched time and remaining time', () => {
    const stats = courseStats(course())
    expect(stats.total).toBe(4)
    expect(stats.completed).toBe(1)
    expect(stats.percent).toBe(25)
    expect(stats.watchedMinutes).toBe(10)
    expect(stats.remainingMinutes).toBe(90)
    expect(stats.codeFiles).toBe(1)
  })

  it('handles a course with no videos without dividing by zero', () => {
    const empty: Course = { ...course(), days: [] }
    expect(courseStats(empty).percent).toBe(0)
  })
})

describe('day statistics', () => {
  it('reports per-day completion', () => {
    const stats = dayStats([video('a', 10, true), video('b', 5, false), video('c', 5, true)])
    expect(stats.completed).toBe(2)
    expect(stats.percent).toBe(67)
    expect(stats.minutes).toBe(15)
  })
})

describe('resume points', () => {
  it('finds the first incomplete video across ordered days', () => {
    const resume = nextIncompleteLesson([course()])
    expect(resume?.videoId).toBe('v2')
    expect(resume?.dayId).toBe('d1')
  })

  it('skips to the next day once a day is fully complete', () => {
    const c = course()
    c.days[0].videos[1].completed = true
    expect(nextIncompleteLesson([c])?.videoId).toBe('v3')
  })

  it('returns null when everything is complete', () => {
    const c = course()
    c.days.forEach((day) => day.videos.forEach((v) => (v.completed = true)))
    expect(nextIncompleteLesson([c])).toBeNull()
  })

  it('identifies the next incomplete day', () => {
    const c = course()
    c.days[0].videos[1].completed = true
    expect(nextIncompleteDay(c)?.id).toBe('d2')
  })
})

describe('learning totals', () => {
  it('aggregates across courses', () => {
    const totals = learningTotals([course(), course()])
    expect(totals.videos).toBe(8)
    expect(totals.completed).toBe(2)
    expect(totals.percent).toBe(25)
  })
})

describe('task statistics', () => {
  it('counts overdue tasks separately from open tasks', () => {
    const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd')
    const stats = taskStats([
      task({ id: '1', completed: true }),
      task({ id: '2', dueDate: yesterday }),
      task({ id: '3' }),
    ])
    expect(stats.total).toBe(3)
    expect(stats.completed).toBe(1)
    expect(stats.open).toBe(2)
    expect(stats.overdue).toBe(1)
    expect(stats.rate).toBe(33)
  })
})

describe('leetcode statistics', () => {
  it('groups solved problems by difficulty', () => {
    const records: LeetCodeRecord[] = [
      { id: '1', title: 'A', difficulty: 'Easy', topics: ['Array'], status: 'solved', url: '', date: '', notes: '', createdAt: '' },
      { id: '2', title: 'B', difficulty: 'Easy', topics: ['Array'], status: 'solved', url: '', date: '', notes: '', createdAt: '' },
      { id: '3', title: 'C', difficulty: 'Hard', topics: ['DP'], status: 'todo', url: '', date: '', notes: '', createdAt: '' },
    ]
    const stats = leetcodeStats(records)
    expect(stats.total).toBe(3)
    expect(stats.solved).toBe(2)
    expect(stats.byDifficulty.find((row) => row.difficulty === 'Easy')?.solved).toBe(2)
    expect(stats.byDifficulty.find((row) => row.difficulty === 'Hard')?.solved).toBe(0)
    expect(stats.topTopics[0]).toEqual({ topic: 'Array', count: 2 })
  })
})

describe('goal progress', () => {
  const goal: Goal = {
    id: 'g1',
    title: 'Goal',
    description: '',
    category: 'General',
    targetDate: null,
    status: 'active',
    createdAt: '',
  }

  it('derives progress from linked tasks', () => {
    const tasks = [
      task({ id: 'a', goalIds: ['g1'], completed: true }),
      task({ id: 'b', goalIds: ['g1'] }),
      task({ id: 'c', goalIds: [] }),
    ]
    expect(goalProgress(goal, tasks)).toEqual({ total: 2, completed: 1, percent: 50 })
  })

  it('falls back to the goal status when nothing is linked', () => {
    expect(goalProgress(goal, []).percent).toBe(0)
    expect(goalProgress({ ...goal, status: 'done' }, []).percent).toBe(100)
  })
})
