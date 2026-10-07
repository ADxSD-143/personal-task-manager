import type { DataState, SearchResult } from '@/types'
import { habitStreak } from './streak'
import { orderedDays } from './analytics'

export const matchesQuery = (
  query: string,
  ...fields: Array<string | number | null | undefined | string[]>
): boolean => {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return fields.some((field) => {
    if (field === null || field === undefined) return false
    if (Array.isArray(field)) return field.join(' ').toLowerCase().includes(q)
    return String(field).toLowerCase().includes(q)
  })
}

export const searchAll = (state: DataState, query: string): SearchResult[] => {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const results: SearchResult[] = []
  const has = (...fields: Array<string | number | null | undefined | string[]>) =>
    matchesQuery(q, ...fields)

  state.tasks.forEach((t) => {
    if (has(t.title, t.description, t.tags, t.priority))
      results.push({
        id: t.id,
        type: 'Task',
        title: t.title,
        subtitle: t.completed ? 'Completed task' : `${t.priority} priority`,
        path: '/tasks',
      })
  })

  state.habits.forEach((h) => {
    if (has(h.name, h.description))
      results.push({
        id: h.id,
        type: 'Habit',
        title: h.name,
        subtitle: `${habitStreak(h)} day streak`,
        path: '/habits',
      })
  })

  state.courses.forEach((c) => {
    if (has(c.title, c.description, c.category))
      results.push({ id: c.id, type: 'Course', title: c.title, subtitle: c.category, path: `/learning/${c.id}` })
    orderedDays(c).forEach((d) => {
      if (has(d.title, d.description, `day ${d.order}`, `${c.title} day ${d.order}`))
        results.push({
          id: d.id,
          type: 'Lesson day',
          title: `Day ${d.order} · ${d.title}`,
          subtitle: c.title,
          path: `/learning/${c.id}/day/${d.id}`,
        })
      d.videos.forEach((v) => {
        if (has(v.title))
          results.push({
            id: v.id,
            type: 'Video',
            title: v.title,
            subtitle: `${c.title} · Day ${d.order}`,
            path: `/learning/${c.id}/day/${d.id}`,
          })
      })
      d.codeFiles.forEach((f) => {
        if (has(f.name, f.language, f.content))
          results.push({
            id: f.id,
            type: 'Code file',
            title: f.name,
            subtitle: `${f.language} · Day ${d.order}`,
            path: `/learning/${c.id}/day/${d.id}`,
          })
      })
    })
  })

  state.subjects.forEach((s) => {
    if (has(s.name))
      results.push({ id: s.id, type: 'Subject', title: s.name, subtitle: 'Study subject', path: '/study' })
  })

  state.studySessions.forEach((s) => {
    const subject = state.subjects.find((x) => x.id === s.subjectId)
    if (has(s.notes, subject?.name))
      results.push({
        id: s.id,
        type: 'Study session',
        title: `${s.minutes} min · ${subject?.name ?? 'Unknown subject'}`,
        subtitle: s.date,
        path: '/study',
      })
  })

  state.workouts.forEach((workout) => {
    if (has(workout.title, workout.notes, workout.date)) {
      results.push({
        id: workout.id,
        type: 'Workout',
        title: workout.title,
        subtitle: workout.date,
        path: '/fitness',
      })
    }
    workout.exercises.forEach((exercise) => {
      if (has(exercise.name, exercise.notes)) {
        results.push({
          id: exercise.id,
          type: 'Exercise',
          title: exercise.name,
          subtitle: workout.title,
          path: '/fitness',
        })
      }
    })
  })

  state.notes.forEach((note) => {
    if (has(note.title, note.content, note.tags)) {
      results.push({ id: note.id, type: 'Note', title: note.title, subtitle: note.tags.join(', '), path: '/notes' })
    }
  })

  state.leetcode.forEach((r) => {
    if (has(r.title, r.topics, r.difficulty, r.notes))
      results.push({ id: r.id, type: 'LeetCode', title: r.title, subtitle: r.difficulty, path: '/coding/leetcode' })
  })

  state.cp.forEach((r) => {
    if (has(r.title, r.topic, r.platform, r.notes))
      results.push({
        id: r.id,
        type: 'CP problem',
        title: r.title,
        subtitle: r.platform,
        path: '/coding/cp',
      })
  })

  state.github.forEach((c) => {
    if (has(c.repo, c.notes))
      results.push({ id: c.id, type: 'Contribution', title: c.repo, subtitle: c.date, path: '/coding/github' })
  })

  state.projects.forEach((p) => {
    if (has(p.name, p.description, p.techStack, p.status))
      results.push({ id: p.id, type: 'Project', title: p.name, subtitle: p.status, path: '/projects' })
  })

  state.goals.forEach((g) => {
    if (has(g.title, g.description, g.category))
      results.push({ id: g.id, type: 'Goal', title: g.title, subtitle: g.category, path: '/goals' })
    g.milestones?.forEach((milestone) => {
      if (has(milestone.title))
        results.push({
          id: milestone.id,
          type: 'Goal milestone',
          title: milestone.title,
          subtitle: g.title,
          path: '/goals',
        })
    })
  })

  return results.slice(0, 60)
}
