import { describe, expect, it } from 'vitest'
import { searchAll } from '@/lib/search'
import { pickData } from '@/lib/exportImport'
import { useStore } from '@/store/useStore'

const data = () => pickData(useStore.getState())

describe('global search', () => {
  it('returns nothing for an empty query', () => {
    expect(searchAll(data(), '   ')).toHaveLength(0)
  })

  it('finds the seeded Machine Learning course', () => {
    const results = searchAll(data(), 'machine learning')
    expect(results.some((result) => result.type === 'Course')).toBe(true)
  })

  it('finds a course day by its day number', () => {
    const results = searchAll(data(), 'day 24')
    expect(results.some((result) => result.type === 'Lesson day')).toBe(true)
  })

  it('finds videos and links them back to their day', () => {
    const results = searchAll(data(), 'backpropagation')
    const video = results.find((result) => result.type === 'Video')
    expect(video).toBeDefined()
    expect(video?.path).toMatch(/^\/learning\/.+\/day\/.+/)
  })

  it('finds tasks by tag', () => {
    const results = searchAll(data(), 'leetcode')
    expect(results.some((result) => result.type === 'Task')).toBe(true)
  })

  it('is case insensitive', () => {
    expect(searchAll(data(), 'PYTHON').length).toBeGreaterThan(0)
  })

  it('finds fitness records and personal notes', () => {
    const workoutId = useStore.getState().addWorkout({ title: 'Morning run' })
    useStore.getState().addWorkoutExercise(workoutId, { name: 'Intervals' })
    useStore.getState().addNote({ title: 'Run route', content: 'Park loop', tags: ['fitness'] })

    expect(searchAll(data(), 'intervals').some((result) => result.type === 'Exercise')).toBe(true)
    expect(searchAll(data(), 'park loop').some((result) => result.type === 'Note')).toBe(true)
  })
})
