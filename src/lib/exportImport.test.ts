import { describe, expect, it } from 'vitest'
import { createExport, mergeData, parseImport, pickData } from '@/lib/exportImport'
import { buildSeedData } from '@/lib/seed'

describe('export', () => {
  it('wraps the data with metadata', () => {
    const bundle = createExport(buildSeedData())
    expect(bundle.app).toBe('personal-os')
    expect(bundle.version).toBe(1)
    expect(bundle.exportedAt).toBeTruthy()
    expect(bundle.data.courses.length).toBeGreaterThan(0)
  })
})

describe('import', () => {
  it('round-trips an exported bundle without loss', () => {
    const data = buildSeedData()
    const bundle = createExport(data)
    const result = parseImport(JSON.stringify(bundle))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.tasks.length).toBe(data.tasks.length)
    expect(result.data.courses[0].days.length).toBe(data.courses[0].days.length)
    expect(result.data.courses[0].days[0].videos.length).toBe(data.courses[0].days[0].videos.length)
    expect(result.data.workouts).toEqual(data.workouts)
    expect(result.data.notes).toEqual(data.notes)
    expect(result.warnings).toHaveLength(0)
  })

  it('accepts a raw data object without the bundle wrapper', () => {
    const result = parseImport(JSON.stringify(pickData(buildSeedData())))
    expect(result.ok).toBe(true)
  })

  it('rejects invalid JSON', () => {
    const result = parseImport('{ not json')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/not valid JSON/i)
  })

  it('rejects an empty file', () => {
    expect(parseImport('   ').ok).toBe(false)
  })

  it('rejects a JSON array at the top level', () => {
    expect(parseImport('[]').ok).toBe(false)
  })

  it('recovers from missing collections and reports warnings', () => {
    const result = parseImport(JSON.stringify({ data: { tasks: [], habits: [] } }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.courses).toEqual([])
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('skips entries that have no id and warns about them', () => {
    const result = parseImport(
      JSON.stringify({ data: { tasks: [{ id: 'keep', title: 'Keep me' }, { title: 'drop me' }] } })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.tasks).toHaveLength(1)
    expect(result.data.tasks[0].title).toBe('Keep me')
    expect(result.warnings.some((warning) => warning.includes('tasks'))).toBe(true)
  })

  it('normalises an invalid theme back to system', () => {
    const result = parseImport(JSON.stringify({ data: { tasks: [], settings: { theme: 'neon' } } }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.settings.theme).toBe('system')
  })
})

describe('merge', () => {
  it('appends only records whose ids are new', () => {
    const current = buildSeedData()
    const incoming = { ...current, tasks: [...current.tasks, { ...current.tasks[0] }] }
    const merged = mergeData(pickData(current), pickData(incoming))
    expect(merged.tasks).toHaveLength(current.tasks.length)
  })

  it('adds genuinely new records', () => {
    const current = buildSeedData()
    const extra = {
      ...pickData(current),
      tasks: [
        {
          id: 'brand-new',
          title: 'New task',
          description: '',
          completed: false,
          priority: 'low' as const,
          tags: [],
          dueDate: null,
          goalIds: [],
          projectId: null,
          createdAt: new Date().toISOString(),
          completedAt: null,
        },
      ],
    }
    const merged = mergeData(pickData(current), extra)
    expect(merged.tasks).toHaveLength(current.tasks.length + 1)
  })

  it('merges new workouts and notes while preserving cloud records with matching ids', () => {
    const cloud = pickData(buildSeedData())
    const local = {
      ...cloud,
      workouts: [{
        id: 'workout-local',
        title: 'Strength',
        date: '2026-10-06',
        notes: '',
        completed: false,
        exercises: [],
        createdAt: '2026-10-06T00:00:00.000Z',
      }],
      notes: [{
        id: 'note-local',
        title: 'Plan',
        content: 'Study',
        tags: ['study'],
        createdAt: '2026-10-06T00:00:00.000Z',
        updatedAt: '2026-10-06T00:00:00.000Z',
      }],
    }
    const merged = mergeData(cloud, local)
    expect(merged.workouts.map((workout) => workout.id)).toContain('workout-local')
    expect(merged.notes.map((note) => note.id)).toContain('note-local')
  })
})
