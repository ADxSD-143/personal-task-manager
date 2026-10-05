import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  CPRecord,
  Course,
  CourseDay,
  DataState,
  GitHubContribution,
  Goal,
  Habit,
  LeetCodeRecord,
  Profile,
  Project,
  Settings,
  StudySession,
  Subject,
  Task,
} from '@/types'
import { uid } from '@/lib/id'
import { todayKey } from '@/lib/date'
import { buildSeedData } from '@/lib/seed'
import { mergeData, pickData } from '@/lib/exportImport'

type Identified = { id: string }

const replace = <T extends Identified>(list: T[], id: string, patch: Partial<T>): T[] =>
  list.map((item) => (item.id === id ? { ...item, ...patch } : item))

const drop = <T extends Identified>(list: T[], id: string): T[] =>
  list.filter((item) => item.id !== id)

export type TaskInput = Partial<Omit<Task, 'id' | 'createdAt'>> & { title: string }
export type HabitInput = Partial<Omit<Habit, 'id' | 'createdAt'>> & { name: string }
export type CourseInput = Partial<Omit<Course, 'id' | 'createdAt'>> & { title: string }
export type SubjectInput = Partial<Omit<Subject, 'id' | 'createdAt'>> & { name: string }
export type StudySessionInput = Partial<Omit<StudySession, 'id' | 'createdAt'>> & {
  subjectId: string
  minutes: number
}
export type LeetCodeInput = Partial<Omit<LeetCodeRecord, 'id' | 'createdAt'>> & { title: string }
export type CPInput = Partial<Omit<CPRecord, 'id' | 'createdAt'>> & { title: string }
export type GitHubInput = Partial<Omit<GitHubContribution, 'id' | 'createdAt'>> & { repo: string }
export type ProjectInput = Partial<Omit<Project, 'id' | 'createdAt'>> & { name: string }
export type GoalInput = Partial<Omit<Goal, 'id' | 'createdAt'>> & { title: string }

export interface AppActions {
  setProfile: (patch: Partial<Profile>) => void
  setSettings: (patch: Partial<Settings>) => void

  addTask: (input: TaskInput) => string
  updateTask: (id: string, patch: Partial<Task>) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void
  clearCompletedTasks: () => void

  addHabit: (input: HabitInput) => string
  updateHabit: (id: string, patch: Partial<Habit>) => void
  removeHabit: (id: string) => void
  toggleHabitDate: (id: string, date: string) => void

  addCourse: (input: CourseInput) => string
  updateCourse: (id: string, patch: Partial<Course>) => void
  removeCourse: (id: string) => void
  addDay: (courseId: string, title: string, description?: string) => void
  updateDay: (courseId: string, dayId: string, patch: Partial<CourseDay>) => void
  removeDay: (courseId: string, dayId: string) => void
  moveDay: (courseId: string, dayId: string, direction: -1 | 1) => void

  addVideo: (courseId: string, dayId: string, input: { title: string; url?: string; duration?: number }) => void
  updateVideo: (courseId: string, dayId: string, videoId: string, patch: Partial<CourseDay['videos'][number]>) => void
  removeVideo: (courseId: string, dayId: string, videoId: string) => void
  toggleVideo: (courseId: string, dayId: string, videoId: string) => void
  moveVideo: (courseId: string, dayId: string, videoId: string, direction: -1 | 1) => void

  addCodeFile: (courseId: string, dayId: string, input: { name: string; language?: string; content?: string }) => void
  updateCodeFile: (courseId: string, dayId: string, fileId: string, patch: Partial<CourseDay['codeFiles'][number]>) => void
  removeCodeFile: (courseId: string, dayId: string, fileId: string) => void

  addSubject: (input: SubjectInput) => string
  updateSubject: (id: string, patch: Partial<Subject>) => void
  removeSubject: (id: string) => void
  addStudySession: (input: StudySessionInput) => void
  updateStudySession: (id: string, patch: Partial<StudySession>) => void
  removeStudySession: (id: string) => void

  addLeetCode: (input: LeetCodeInput) => void
  updateLeetCode: (id: string, patch: Partial<LeetCodeRecord>) => void
  removeLeetCode: (id: string) => void

  addCp: (input: CPInput) => void
  updateCp: (id: string, patch: Partial<CPRecord>) => void
  removeCp: (id: string) => void

  addGithub: (input: GitHubInput) => void
  updateGithub: (id: string, patch: Partial<GitHubContribution>) => void
  removeGithub: (id: string) => void

  addProject: (input: ProjectInput) => string
  updateProject: (id: string, patch: Partial<Project>) => void
  removeProject: (id: string) => void

  addGoal: (input: GoalInput) => string
  updateGoal: (id: string, patch: Partial<Goal>) => void
  removeGoal: (id: string) => void
  toggleGoalStatus: (id: string) => void

  importData: (data: DataState, mode: 'replace' | 'merge') => void
  resetAll: () => void
  clearAll: () => void
}

export type AppStore = DataState & AppActions

const now = (): string => new Date().toISOString()

const coursePatch = (
  courses: Course[],
  courseId: string,
  updater: (course: Course) => Course
): Course[] => courses.map((course) => (course.id === courseId ? updater(course) : course))

const dayPatch = (course: Course, dayId: string, updater: (day: CourseDay) => CourseDay): Course => ({
  ...course,
  days: course.days.map((day) => (day.id === dayId ? updater(day) : day)),
})

const swap = <T extends Identified>(list: T[], id: string, direction: -1 | 1): T[] => {
  const index = list.findIndex((item) => item.id === id)
  const target = index + direction
  if (index === -1 || target < 0 || target >= list.length) return list
  const next = [...list]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  return next
}

const emptyData = (): DataState => ({
  profile: { name: 'My Personal OS', tagline: 'Learn · Build · Track' },
  settings: { theme: 'system', weekStartsOn: 1 },
  tasks: [],
  habits: [],
  courses: [],
  subjects: [],
  studySessions: [],
  leetcode: [],
  cp: [],
  github: [],
  projects: [],
  goals: [],
})

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      ...buildSeedData(),

      setProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),
      setSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),

      addTask: (input) => {
        const task: Task = {
          id: uid(),
          title: input.title,
          description: input.description ?? '',
          completed: input.completed ?? false,
          priority: input.priority ?? 'medium',
          tags: input.tags ?? [],
          dueDate: input.dueDate ?? null,
          goalIds: input.goalIds ?? [],
          projectId: input.projectId ?? null,
          createdAt: now(),
          completedAt: input.completed ? now() : null,
        }
        set((state) => ({ tasks: [task, ...state.tasks] }))
        return task.id
      },
      updateTask: (id, patch) => set((state) => ({ tasks: replace(state.tasks, id, patch) })),
      toggleTask: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, completed: !task.completed, completedAt: task.completed ? null : now() }
              : task
          ),
        })),
      removeTask: (id) => set((state) => ({ tasks: drop(state.tasks, id) })),
      clearCompletedTasks: () => set((state) => ({ tasks: state.tasks.filter((t) => !t.completed) })),

      addHabit: (input) => {
        const habit: Habit = {
          id: uid(),
          name: input.name,
          description: input.description ?? '',
          color: input.color ?? '#6366f1',
          frequency: input.frequency ?? 'daily',
          targetPerPeriod: input.targetPerPeriod ?? (input.frequency === 'weekly' ? 5 : 1),
          completions: input.completions ?? [],
          createdAt: now(),
        }
        set((state) => ({ habits: [habit, ...state.habits] }))
        return habit.id
      },
      updateHabit: (id, patch) => set((state) => ({ habits: replace(state.habits, id, patch) })),
      removeHabit: (id) => set((state) => ({ habits: drop(state.habits, id) })),
      toggleHabitDate: (id, date) =>
        set((state) => ({
          habits: state.habits.map((habit) =>
            habit.id === id
              ? {
                  ...habit,
                  completions: habit.completions.includes(date)
                    ? habit.completions.filter((d) => d !== date)
                    : [...habit.completions, date].sort(),
                }
              : habit
          ),
        })),

      addCourse: (input) => {
        const course: Course = {
          id: uid(),
          title: input.title,
          description: input.description ?? '',
          category: input.category ?? 'General',
          color: input.color ?? '#6366f1',
          days: input.days ?? [],
          createdAt: now(),
        }
        set((state) => ({ courses: [course, ...state.courses] }))
        return course.id
      },
      updateCourse: (id, patch) => set((state) => ({ courses: replace(state.courses, id, patch) })),
      removeCourse: (id) => set((state) => ({ courses: drop(state.courses, id) })),
      addDay: (courseId, title, description = '') =>
        set((state) => ({
          courses: coursePatch(state.courses, courseId, (course) => ({
            ...course,
            days: [
              ...course.days,
              {
                id: uid(),
                title: title.trim() || 'Untitled day',
                description,
                order: course.days.length + 1,
                videos: [],
                codeFiles: [],
              },
            ],
          })),
        })),
      updateDay: (courseId, dayId, patch) =>
        set((state) => ({
          courses: coursePatch(state.courses, courseId, (course) => dayPatch(course, dayId, (day) => ({ ...day, ...patch }))),
        })),
      removeDay: (courseId, dayId) =>
        set((state) => ({
          courses: coursePatch(state.courses, courseId, (course) => ({
            ...course,
            days: course.days
              .filter((day) => day.id !== dayId)
              .sort((a, b) => a.order - b.order)
              .map((day, index) => ({ ...day, order: index + 1 })),
          })),
        })),
      moveDay: (courseId, dayId, direction) =>
        set((state) => ({
          courses: coursePatch(state.courses, courseId, (course) => {
            const ordered = swap([...course.days].sort((a, b) => a.order - b.order), dayId, direction)
            return { ...course, days: ordered.map((day, index) => ({ ...day, order: index + 1 })) }
          }),
        })),

      addVideo: (courseId, dayId, input) =>
        set((state) => ({
          courses: coursePatch(state.courses, courseId, (course) =>
            dayPatch(course, dayId, (day) => ({
              ...day,
              videos: [
                ...day.videos,
                {
                  id: uid(),
                  title: input.title.trim() || 'Untitled video',
                  url: input.url?.trim() ?? '',
                  duration: input.duration && input.duration > 0 ? input.duration : 10,
                  completed: false,
                  completedAt: null,
                },
              ],
            }))
          ),
        })),
      updateVideo: (courseId, dayId, videoId, patch) =>
        set((state) => ({
          courses: coursePatch(state.courses, courseId, (course) =>
            dayPatch(course, dayId, (day) => ({ ...day, videos: replace(day.videos, videoId, patch) }))
          ),
        })),
      removeVideo: (courseId, dayId, videoId) =>
        set((state) => ({
          courses: coursePatch(state.courses, courseId, (course) =>
            dayPatch(course, dayId, (day) => ({ ...day, videos: drop(day.videos, videoId) }))
          ),
        })),
      toggleVideo: (courseId, dayId, videoId) =>
        set((state) => ({
          courses: coursePatch(state.courses, courseId, (course) =>
            dayPatch(course, dayId, (day) => ({
              ...day,
              videos: day.videos.map((video) =>
                video.id === videoId
                  ? { ...video, completed: !video.completed, completedAt: video.completed ? null : now() }
                  : video
              ),
            }))
          ),
        })),
      moveVideo: (courseId, dayId, videoId, direction) =>
        set((state) => ({
          courses: coursePatch(state.courses, courseId, (course) =>
            dayPatch(course, dayId, (day) => ({ ...day, videos: swap(day.videos, videoId, direction) }))
          ),
        })),

      addCodeFile: (courseId, dayId, input) =>
        set((state) => ({
          courses: coursePatch(state.courses, courseId, (course) =>
            dayPatch(course, dayId, (day) => ({
              ...day,
              codeFiles: [
                ...day.codeFiles,
                {
                  id: uid(),
                  name: input.name.trim() || 'untitled.py',
                  language: input.language?.trim() || 'python',
                  content: input.content ?? '',
                  updatedAt: now(),
                },
              ],
            }))
          ),
        })),
      updateCodeFile: (courseId, dayId, fileId, patch) =>
        set((state) => ({
          courses: coursePatch(state.courses, courseId, (course) =>
            dayPatch(course, dayId, (day) => ({
              ...day,
              codeFiles: replace(day.codeFiles, fileId, { ...patch, updatedAt: now() }),
            }))
          ),
        })),
      removeCodeFile: (courseId, dayId, fileId) =>
        set((state) => ({
          courses: coursePatch(state.courses, courseId, (course) =>
            dayPatch(course, dayId, (day) => ({ ...day, codeFiles: drop(day.codeFiles, fileId) }))
          ),
        })),

      addSubject: (input) => {
        const subject: Subject = {
          id: uid(),
          name: input.name,
          color: input.color ?? '#6366f1',
          createdAt: now(),
        }
        set((state) => ({ subjects: [subject, ...state.subjects] }))
        return subject.id
      },
      updateSubject: (id, patch) => set((state) => ({ subjects: replace(state.subjects, id, patch) })),
      removeSubject: (id) =>
        set((state) => ({
          subjects: drop(state.subjects, id),
          studySessions: state.studySessions.filter((session) => session.subjectId !== id),
        })),
      addStudySession: (input) =>
        set((state) => ({
          studySessions: [
            {
              id: uid(),
              subjectId: input.subjectId,
              date: input.date ?? todayKey(),
              minutes: Math.max(1, Math.round(input.minutes)),
              notes: input.notes ?? '',
              createdAt: now(),
            },
            ...state.studySessions,
          ],
        })),
      updateStudySession: (id, patch) =>
        set((state) => ({ studySessions: replace(state.studySessions, id, patch) })),
      removeStudySession: (id) => set((state) => ({ studySessions: drop(state.studySessions, id) })),

      addLeetCode: (input) =>
        set((state) => ({
          leetcode: [
            {
              id: uid(),
              title: input.title,
              difficulty: input.difficulty ?? 'Easy',
              topics: input.topics ?? [],
              status: input.status ?? 'todo',
              url: input.url ?? '',
              date: input.date ?? todayKey(),
              notes: input.notes ?? '',
              createdAt: now(),
            },
            ...state.leetcode,
          ],
        })),
      updateLeetCode: (id, patch) => set((state) => ({ leetcode: replace(state.leetcode, id, patch) })),
      removeLeetCode: (id) => set((state) => ({ leetcode: drop(state.leetcode, id) })),

      addCp: (input) =>
        set((state) => ({
          cp: [
            {
              id: uid(),
              platform: input.platform ?? 'Codeforces',
              title: input.title,
              rating: input.rating ?? null,
              topic: input.topic ?? '',
              status: input.status ?? 'todo',
              url: input.url ?? '',
              date: input.date ?? todayKey(),
              notes: input.notes ?? '',
              createdAt: now(),
            },
            ...state.cp,
          ],
        })),
      updateCp: (id, patch) => set((state) => ({ cp: replace(state.cp, id, patch) })),
      removeCp: (id) => set((state) => ({ cp: drop(state.cp, id) })),

      addGithub: (input) =>
        set((state) => ({
          github: [
            {
              id: uid(),
              repo: input.repo,
              date: input.date ?? todayKey(),
              commits: input.commits ?? 1,
              prs: input.prs ?? 0,
              issues: input.issues ?? 0,
              notes: input.notes ?? '',
              createdAt: now(),
            },
            ...state.github,
          ],
        })),
      updateGithub: (id, patch) => set((state) => ({ github: replace(state.github, id, patch) })),
      removeGithub: (id) => set((state) => ({ github: drop(state.github, id) })),

      addProject: (input) => {
        const project: Project = {
          id: uid(),
          name: input.name,
          description: input.description ?? '',
          status: input.status ?? 'idea',
          techStack: input.techStack ?? [],
          repoUrl: input.repoUrl ?? '',
          liveUrl: input.liveUrl ?? '',
          createdAt: now(),
        }
        set((state) => ({ projects: [project, ...state.projects] }))
        return project.id
      },
      updateProject: (id, patch) => set((state) => ({ projects: replace(state.projects, id, patch) })),
      removeProject: (id) =>
        set((state) => ({
          projects: drop(state.projects, id),
          tasks: state.tasks.map((task) =>
            task.projectId === id ? { ...task, projectId: null } : task
          ),
        })),

      addGoal: (input) => {
        const goal: Goal = {
          id: uid(),
          title: input.title,
          description: input.description ?? '',
          category: input.category ?? 'General',
          targetDate: input.targetDate ?? null,
          status: input.status ?? 'active',
          createdAt: now(),
        }
        set((state) => ({ goals: [goal, ...state.goals] }))
        return goal.id
      },
      updateGoal: (id, patch) => set((state) => ({ goals: replace(state.goals, id, patch) })),
      removeGoal: (id) =>
        set((state) => ({
          goals: drop(state.goals, id),
          tasks: state.tasks.map((task) =>
            task.goalIds.includes(id)
              ? { ...task, goalIds: task.goalIds.filter((goalId) => goalId !== id) }
              : task
          ),
        })),
      toggleGoalStatus: (id) =>
        set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === id ? { ...goal, status: goal.status === 'done' ? 'active' : 'done' } : goal
          ),
        })),

      importData: (data, mode) =>
        set((state) => {
          if (mode === 'replace') return { ...pickData(data) }
          return { ...mergeData(pickData(state), data) }
        }),
      resetAll: () => set(() => ({ ...buildSeedData() })),
      clearAll: () => set(() => ({ ...emptyData() })),
    }),
    {
      name: 'personal-os-v1',
      version: 1,
      partialize: (state) => pickData(state as unknown as DataState),
      merge: (persisted, current) => {
        const incoming = (persisted ?? {}) as Partial<DataState>
        return {
          ...current,
          ...incoming,
          profile: { ...current.profile, ...(incoming.profile ?? {}) },
          settings: { ...current.settings, ...(incoming.settings ?? {}) },
          tasks: incoming.tasks ?? current.tasks,
          habits: incoming.habits ?? current.habits,
          courses: incoming.courses ?? current.courses,
          subjects: incoming.subjects ?? current.subjects,
          studySessions: incoming.studySessions ?? current.studySessions,
          leetcode: incoming.leetcode ?? current.leetcode,
          cp: incoming.cp ?? current.cp,
          github: incoming.github ?? current.github,
          projects: incoming.projects ?? current.projects,
          goals: incoming.goals ?? current.goals,
        }
      },
    }
  )
)

