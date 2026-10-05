import type {
  CPRecord,
  Course,
  DataState,
  GitHubContribution,
  Goal,
  Habit,
  LeetCodeRecord,
  Project,
  StudySession,
  Subject,
  Task,
} from '@/types'
import { uid } from './id'
import { todayKey } from './date'

export interface ExportBundle {
  app: 'personal-os'
  version: number
  exportedAt: string
  data: DataState
}

export const EXPORT_VERSION = 1

export const DATA_KEYS: Array<keyof DataState> = [
  'profile',
  'settings',
  'tasks',
  'habits',
  'courses',
  'subjects',
  'studySessions',
  'leetcode',
  'cp',
  'github',
  'projects',
  'goals',
]

export const createExport = (data: DataState): ExportBundle => ({
  app: 'personal-os',
  version: EXPORT_VERSION,
  exportedAt: new Date().toISOString(),
  data: pickData(data),
})

export const pickData = (state: DataState): DataState => ({
  profile: state.profile,
  settings: state.settings,
  tasks: state.tasks,
  habits: state.habits,
  courses: state.courses,
  subjects: state.subjects,
  studySessions: state.studySessions,
  leetcode: state.leetcode,
  cp: state.cp,
  github: state.github,
  projects: state.projects,
  goals: state.goals,
})

export type ImportResult =
  | { ok: true; data: DataState; warnings: string[] }
  | { ok: false; error: string }

const ARRAY_KEYS: Array<keyof DataState> = [
  'tasks',
  'habits',
  'courses',
  'subjects',
  'studySessions',
  'leetcode',
  'cp',
  'github',
  'projects',
  'goals',
]

export const parseImport = (text: string): ImportResult => {
  if (!text.trim()) return { ok: false, error: 'The selected file is empty.' }

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' }
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'Expected a JSON object at the top level.' }
  }

  const root = raw as Record<string, unknown>
  const candidate = (root.data ?? root) as Record<string, unknown>

  if (typeof candidate !== 'object' || candidate === null) {
    return { ok: false, error: 'Missing "data" payload.' }
  }

  const warnings: string[] = []
  const missing = ARRAY_KEYS.filter((key) => !Array.isArray(candidate[key]))
  if (missing.length > 0) {
    warnings.push(`Missing or invalid collections were imported as empty: ${missing.join(', ')}`)
  }

  const data: DataState = {
    profile: normalizeProfile(candidate.profile, warnings),
    settings: normalizeSettings(candidate.settings, warnings),
    tasks: normalizeArray<Task>(candidate.tasks, warnings, 'tasks'),
    habits: normalizeArray<Habit>(candidate.habits, warnings, 'habits'),
    courses: normalizeArray<Course>(candidate.courses, warnings, 'courses'),
    subjects: normalizeArray<Subject>(candidate.subjects, warnings, 'subjects'),
    studySessions: normalizeArray<StudySession>(candidate.studySessions, warnings, 'studySessions'),
    leetcode: normalizeArray<LeetCodeRecord>(candidate.leetcode, warnings, 'leetcode'),
    cp: normalizeArray<CPRecord>(candidate.cp, warnings, 'cp'),
    github: normalizeArray<GitHubContribution>(candidate.github, warnings, 'github'),
    projects: normalizeArray<Project>(candidate.projects, warnings, 'projects'),
    goals: normalizeArray<Goal>(candidate.goals, warnings, 'goals'),
  }

  if (data.tasks.length + data.habits.length + data.courses.length === 0) {
    warnings.push('The import contains no tasks, habits or courses.')
  }

  return { ok: true, data, warnings }
}

const normalizeArray = <T>(value: unknown, warnings: string[], label: string): T[] => {
  if (!Array.isArray(value)) return []
  const items = value.filter(
    (item): item is T => typeof item === 'object' && item !== null && typeof (item as { id?: unknown }).id === 'string'
  ) as T[]
  if (items.length !== value.length) {
    warnings.push(`${value.length - items.length} invalid entries were skipped in "${label}".`)
  }
  return items.map((item) => ({ ...item, id: (item as { id: string }).id || uid() }))
}

const normalizeProfile = (value: unknown, warnings: string[]): DataState['profile'] => {
  if (typeof value === 'object' && value !== null) {
    const p = value as Record<string, unknown>
    return {
      name: typeof p.name === 'string' ? p.name : 'My Personal OS',
      tagline: typeof p.tagline === 'string' ? p.tagline : '',
    }
  }
  warnings.push('Profile was missing and has been reset.')
  return { name: 'My Personal OS', tagline: '' }
}

const normalizeSettings = (value: unknown, warnings: string[]): DataState['settings'] => {
  if (typeof value === 'object' && value !== null) {
    const s = value as Record<string, unknown>
    const theme = s.theme === 'dark' || s.theme === 'light' || s.theme === 'system' ? s.theme : 'system'
    const weekStartsOn = s.weekStartsOn === 0 || s.weekStartsOn === 1 ? s.weekStartsOn : 1
    return { theme, weekStartsOn }
  }
  warnings.push('Settings were missing and have been reset.')
  return { theme: 'system', weekStartsOn: 1 }
}

/** Append imported records that are not already present by id. */
export const mergeData = (current: DataState, incoming: DataState): DataState => {
  const mergeList = <T extends { id: string }>(a: T[], b: T[]): T[] => {
    const ids = new Set(a.map((item) => item.id))
    return [...a, ...b.filter((item) => !ids.has(item.id))]
  }
  return {
    profile: incoming.profile.name ? incoming.profile : current.profile,
    settings: current.settings,
    tasks: mergeList(current.tasks, incoming.tasks),
    habits: mergeList(current.habits, incoming.habits),
    courses: mergeList(current.courses, incoming.courses),
    subjects: mergeList(current.subjects, incoming.subjects),
    studySessions: mergeList(current.studySessions, incoming.studySessions),
    leetcode: mergeList(current.leetcode, incoming.leetcode),
    cp: mergeList(current.cp, incoming.cp),
    github: mergeList(current.github, incoming.github),
    projects: mergeList(current.projects, incoming.projects),
    goals: mergeList(current.goals, incoming.goals),
  }
}

export const downloadBundle = (bundle: ExportBundle): void => {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `personal-os-backup-${todayKey()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
