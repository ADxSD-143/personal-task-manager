import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '@/store/useStore'
import { pickData } from '@/lib/exportImport'
import { buildSeedData } from '@/lib/seed'
import { courseStats } from '@/lib/analytics'
import { todayKey } from '@/lib/date'

const s = () => useStore.getState()

describe('store — tasks', () => {
  beforeEach(() => s().clearAll())

  it('creates a task with defaults', () => {
    s().addTask({ title: 'Write tests' })
    const [task] = s().tasks
    expect(task.title).toBe('Write tests')
    expect(task.completed).toBe(false)
    expect(task.completedAt).toBeNull()
    expect(task.priority).toBe('medium')
  })

  it('toggles a task and stamps the completion time', () => {
    const id = s().addTask({ title: 'Ship it' })
    s().toggleTask(id)
    expect(s().tasks[0].completed).toBe(true)
    expect(s().tasks[0].completedAt).not.toBeNull()

    s().toggleTask(id)
    expect(s().tasks[0].completed).toBe(false)
    expect(s().tasks[0].completedAt).toBeNull()
  })

  it('updates, removes and clears completed tasks', () => {
    const a = s().addTask({ title: 'A' })
    const b = s().addTask({ title: 'B' })
    s().updateTask(a, { priority: 'urgent', tags: ['x'] })
    expect(s().tasks.find((t) => t.id === a)?.priority).toBe('urgent')

    s().toggleTask(b)
    s().clearCompletedTasks()
    expect(s().tasks).toHaveLength(1)
    expect(s().tasks[0].id).toBe(a)

    s().removeTask(a)
    expect(s().tasks).toHaveLength(0)
  })
})

describe('store — habits', () => {
  beforeEach(() => s().clearAll())

  it('logs and unlogs a date, keeping completions sorted and unique', () => {
    const id = s().addHabit({ name: 'Read' })
    s().toggleHabitDate(id, '2026-01-03')
    s().toggleHabitDate(id, '2026-01-01')
    expect(s().habits[0].completions).toEqual(['2026-01-01', '2026-01-03'])

    s().toggleHabitDate(id, '2026-01-01')
    expect(s().habits[0].completions).toEqual(['2026-01-03'])
  })

  it('defaults the weekly target to five days', () => {
    s().addHabit({ name: 'Gym', frequency: 'weekly' })
    expect(s().habits[0].targetPerPeriod).toBe(5)
  })
})

describe('store — learning', () => {
  beforeEach(() => s().clearAll())

  const seedCourse = () => {
    const courseId = s().addCourse({ title: 'ML' })
    s().addDay(courseId, 'Day one')
    s().addDay(courseId, 'Day two')
    const firstDay = s().courses[0].days[0]
    s().addVideo(courseId, firstDay.id, { title: 'Intro', duration: 20 })
    s().addVideo(courseId, firstDay.id, { title: 'Deep dive', duration: 40 })
    return { courseId, dayId: firstDay.id }
  }

  it('adds days with sequential order numbers', () => {
    const { courseId } = seedCourse()
    s().addDay(courseId, 'Day three')
    expect(s().courses[0].days.map((day) => day.order)).toEqual([1, 2, 3])
  })

  it('recalculates progress when a video is completed or removed', () => {
    const { courseId, dayId } = seedCourse()
    expect(courseStats(s().courses[0]).percent).toBe(0)

    const [first] = s().courses[0].days[0].videos
    s().toggleVideo(courseId, dayId, first.id)
    expect(courseStats(s().courses[0]).percent).toBe(50)

    s().removeVideo(courseId, dayId, first.id)
    const stats = courseStats(s().courses[0])
    expect(stats.total).toBe(1)
    expect(stats.completed).toBe(0)
    expect(stats.percent).toBe(0)
  })

  it('reorders videos in both directions and ignores out-of-range moves', () => {
    const { courseId, dayId } = seedCourse()
    const ids = s().courses[0].days[0].videos.map((video) => video.id)

    s().moveVideo(courseId, dayId, ids[0], 1)
    expect(s().courses[0].days[0].videos.map((v) => v.id)).toEqual([ids[1], ids[0]])

    s().moveVideo(courseId, dayId, ids[0], -1)
    expect(s().courses[0].days[0].videos.map((v) => v.id)).toEqual([ids[0], ids[1]])

    s().moveVideo(courseId, dayId, ids[0], -1)
    expect(s().courses[0].days[0].videos.map((v) => v.id)).toEqual([ids[0], ids[1]])
  })

  it('renumbers days after a deletion', () => {
    const { courseId } = seedCourse()
    const middle = s().courses[0].days[0].id
    s().removeDay(courseId, middle)
    expect(s().courses[0].days.map((day) => day.order)).toEqual([1])
    expect(s().courses[0].days[0].title).toBe('Day two')
  })

  it('reorders days', () => {
    const { courseId } = seedCourse()
    const firstId = s().courses[0].days[0].id
    s().moveDay(courseId, firstId, 1)
    expect(s().courses[0].days.map((day) => day.title)).toEqual(['Day two', 'Day one'])
    expect(s().courses[0].days.map((day) => day.order)).toEqual([1, 2])
  })

  it('manages code files per day', () => {
    const { courseId, dayId } = seedCourse()
    s().addCodeFile(courseId, dayId, { name: 'notes.py', content: 'print(1)' })
    const file = s().courses[0].days[0].codeFiles[0]
    expect(file.name).toBe('notes.py')

    s().updateCodeFile(courseId, dayId, file.id, { content: 'print(2)' })
    expect(s().courses[0].days[0].codeFiles[0].content).toBe('print(2)')

    s().removeCodeFile(courseId, dayId, file.id)
    expect(s().courses[0].days[0].codeFiles).toHaveLength(0)
  })
})

describe('store — referential integrity', () => {
  beforeEach(() => s().clearAll())

  it('unlinks tasks when a goal is deleted', () => {
    const goalId = s().addGoal({ title: 'Learn ML' })
    const taskId = s().addTask({ title: 'Watch lesson', goalIds: [goalId] })
    s().removeGoal(goalId)
    expect(s().tasks.find((task) => task.id === taskId)?.goalIds).toEqual([])
  })

  it('unassigns tasks when a project is deleted', () => {
    const projectId = s().addProject({ name: 'Personal OS' })
    const taskId = s().addTask({ title: 'Build it', projectId })
    s().removeProject(projectId)
    expect(s().tasks.find((task) => task.id === taskId)?.projectId).toBeNull()
  })

  it('deletes a subject together with its study sessions', () => {
    const subjectId = s().addSubject({ name: 'OS' })
    s().addStudySession({ subjectId, minutes: 30 })
    expect(s().studySessions).toHaveLength(1)
    s().removeSubject(subjectId)
    expect(s().subjects).toHaveLength(0)
    expect(s().studySessions).toHaveLength(0)
  })

  it('keeps a study session on the correct date', () => {
    const subjectId = s().addSubject({ name: 'DSA' })
    s().addStudySession({ subjectId, minutes: 45 })
    expect(s().studySessions[0].date).toBe(todayKey())
    expect(s().studySessions[0].minutes).toBe(45)
  })
})

describe('store — data management', () => {
  beforeEach(() => s().clearAll())

  it('replaces everything on a replace import', () => {
    const seeded = buildSeedData()
    s().importData(seeded, 'replace')
    expect(s().tasks).toHaveLength(seeded.tasks.length)
    expect(s().courses).toHaveLength(1)
  })

  it('merges on a merge import without duplicating ids', () => {
    const seeded = buildSeedData()
    s().importData(seeded, 'replace')
    s().importData(seeded, 'merge')
    expect(s().tasks).toHaveLength(seeded.tasks.length)
  })

  it('resets to sample data and clears completely', () => {
    s().resetAll()
    expect(s().courses.length).toBeGreaterThan(0)
    s().clearAll()
    expect(s().tasks).toHaveLength(0)
    expect(s().courses).toHaveLength(0)
  })

  it('writes data to local storage so it survives a reload', () => {
    s().addTask({ title: 'Persisted task' })
    const raw = window.localStorage.getItem('personal-os-v1')
    expect(raw).toBeTruthy()
    expect(raw).toContain('Persisted task')
    const parsed = JSON.parse(raw ?? '{}') as { state?: { tasks?: unknown[] } }
    expect(parsed.state?.tasks).toHaveLength(1)
  })

  it('does not persist actions into storage', () => {
    s().addTask({ title: 'X' })
    const parsed = JSON.parse(window.localStorage.getItem('personal-os-v1') ?? '{}') as {
      state?: Record<string, unknown>
    }
    expect(parsed.state?.addTask).toBeUndefined()
    expect(Object.keys(parsed.state ?? {})).toEqual(expect.arrayContaining(['tasks', 'habits', 'courses']))
    expect(pickData(s())).not.toHaveProperty('addTask')
  })
})
