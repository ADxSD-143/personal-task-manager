import type {
  CPRecord,
  Course,
  GitHubContribution,
  Goal,
  Habit,
  LeetCodeRecord,
  StudySession,
  Subject,
  Task,
} from '@/types'
import { lastNDays, toKey, todayKey, formatDuration } from './date'
import { habitLongestStreak, habitRateLastNDays, habitStreak } from './streak'

export interface TrendPoint {
  date: string
  label: string
  value: number
}

export const taskStats = (tasks: Task[]) => {
  const total = tasks.length
  const completed = tasks.filter((t) => t.completed).length
  const open = total - completed
  const overdue = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayKey()).length
  const dueToday = tasks.filter((t) => !t.completed && t.dueDate === todayKey()).length
  const rate = total === 0 ? 0 : Math.round((completed / total) * 100)
  const byPriority = (['urgent', 'high', 'medium', 'low'] as const).map((priority) => ({
    priority,
    count: tasks.filter((t) => t.priority === priority && !t.completed).length,
  }))
  return { total, completed, open, overdue, dueToday, rate, byPriority }
}

export const taskTrend = (tasks: Task[], days = 14): TrendPoint[] =>
  lastNDays(days).map((date) => ({
    date,
    label: date.slice(5),
    value: tasks.filter((t) => t.completedAt && toKey(t.completedAt) === date).length,
  }))

export const habitStats = (habit: Habit) => {
  const window = lastNDays(30)
  return {
    streak: habitStreak(habit),
    longest: habitLongestStreak(habit),
    rate: habitRateLastNDays(habit, window),
    last30: habit.completions.filter((d) => window.includes(d)).length,
    total: habit.completions.length,
  }
}

export const studyTotals = (sessions: StudySession[]) => {
  const minutes = sessions.reduce((sum, s) => sum + s.minutes, 0)
  const week = lastNDays(7)
  const weekMinutes = sessions
    .filter((s) => week.includes(s.date))
    .reduce((sum, s) => sum + s.minutes, 0)
  const activeDays = new Set(sessions.map((s) => s.date)).size
  const avgPerActiveDay = activeDays === 0 ? 0 : Math.round(minutes / activeDays)
  return { minutes, weekMinutes, sessions: sessions.length, activeDays, avgPerActiveDay }
}

export const studyTrend = (sessions: StudySession[], days = 14): TrendPoint[] =>
  lastNDays(days).map((date) => ({
    date,
    label: date.slice(5),
    value: sessions.filter((s) => s.date === date).reduce((sum, s) => sum + s.minutes, 0),
  }))

export const studyBySubject = (sessions: StudySession[], subjects: Subject[]) =>
  subjects
    .map((subject) => ({
      subject: subject.name,
      color: subject.color,
      minutes: sessions
        .filter((s) => s.subjectId === subject.id)
        .reduce((sum, s) => sum + s.minutes, 0),
    }))
    .filter((row) => row.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)

export const leetcodeStats = (records: LeetCodeRecord[]) => {
  const solved = records.filter((r) => r.status === 'solved')
  const byDifficulty = (['Easy', 'Medium', 'Hard'] as const).map((difficulty) => ({
    difficulty,
    solved: solved.filter((r) => r.difficulty === difficulty).length,
    total: records.filter((r) => r.difficulty === difficulty).length,
  }))
  const topicCounts = new Map<string, number>()
  records.forEach((r) => r.topics.forEach((t) => topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1)))
  const topTopics = Array.from(topicCounts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
  return { total: records.length, solved: solved.length, byDifficulty, topTopics }
}

export const leetcodeTrend = (records: LeetCodeRecord[], days = 14): TrendPoint[] =>
  lastNDays(days).map((date) => ({
    date,
    label: date.slice(5),
    value: records.filter((r) => r.status === 'solved' && r.date === date).length,
  }))

export const cpStats = (records: CPRecord[]) => {
  const solved = records.filter((r) => r.status === 'solved')
  const rated = solved.filter((r) => typeof r.rating === 'number' && r.rating > 0)
  const avgRating =
    rated.length === 0
      ? 0
      : Math.round(rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length)
  const maxRating = rated.reduce((max, r) => Math.max(max, r.rating ?? 0), 0)
  const platforms = Array.from(new Set(records.map((r) => r.platform).filter(Boolean)))
  const byPlatform = platforms.map((platform) => ({
    platform,
    solved: solved.filter((r) => r.platform === platform).length,
    total: records.filter((r) => r.platform === platform).length,
  }))
  return { total: records.length, solved: solved.length, avgRating, maxRating, byPlatform }
}

export const githubStats = (contributions: GitHubContribution[], days = 30) => {
  const commits = contributions.reduce((sum, c) => sum + c.commits, 0)
  const prs = contributions.reduce((sum, c) => sum + c.prs, 0)
  const issues = contributions.reduce((sum, c) => sum + c.issues, 0)
  const window = lastNDays(days)
  const activeDays = new Set(contributions.filter((c) => c.commits > 0).map((c) => c.date))
  const windowCommits = contributions
    .filter((c) => window.includes(c.date))
    .reduce((sum, c) => sum + c.commits, 0)
  // Streak of consecutive days (ending today) with at least one commit.
  let streak = 0
  for (let i = 0; i < window.length; i += 1) {
    const day = window[window.length - 1 - i]
    if (activeDays.has(day)) streak += 1
    else if (i > 0) break
  }
  return { commits, prs, issues, streak, windowCommits, activeDays: activeDays.size }
}

export const githubTrend = (contributions: GitHubContribution[], days = 30): TrendPoint[] =>
  lastNDays(days).map((date) => ({
    date,
    label: date.slice(5),
    value: contributions.filter((c) => c.date === date).reduce((sum, c) => sum + c.commits, 0),
  }))

export const courseStats = (course: Course) => {
  const videos = course.days.flatMap((d) => d.videos)
  const completed = videos.filter((v) => v.completed).length
  const total = videos.length
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
  const minutes = videos.reduce((sum, v) => sum + (v.completed ? v.duration : 0), 0)
  const remaining = videos.reduce((sum, v) => sum + (v.completed ? 0 : v.duration), 0)
  const codeFiles = course.days.reduce((sum, d) => sum + d.codeFiles.length, 0)
  return {
    total,
    completed,
    percent,
    watchedMinutes: minutes,
    remainingMinutes: remaining,
    watchedLabel: formatDuration(minutes),
    remainingLabel: formatDuration(remaining),
    codeFiles,
    days: course.days.length,
  }
}

export const dayStats = (videos: { completed: boolean; duration: number }[]) => {
  const total = videos.length
  const completed = videos.filter((v) => v.completed).length
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
  const minutes = videos.reduce((sum, v) => sum + (v.completed ? v.duration : 0), 0)
  return { total, completed, percent, minutes }
}

export interface ResumePoint {
  courseId: string
  courseTitle: string
  dayId: string
  dayTitle: string
  dayOrder: number
  videoId: string
  videoTitle: string
}

export const orderedDays = (course: Course) => [...course.days].sort((a, b) => a.order - b.order)

export const nextIncompleteLesson = (
  courses: Course[],
  onlyCourseId?: string
): ResumePoint | null => {
  const pool = onlyCourseId ? courses.filter((c) => c.id === onlyCourseId) : courses
  for (const course of pool) {
    for (const day of orderedDays(course)) {
      const video = day.videos.find((v) => !v.completed)
      if (video) {
        return {
          courseId: course.id,
          courseTitle: course.title,
          dayId: day.id,
          dayTitle: day.title,
          dayOrder: day.order,
          videoId: video.id,
          videoTitle: video.title,
        }
      }
    }
  }
  return null
}

export const nextIncompleteDay = (course: Course) =>
  orderedDays(course).find((d) => d.videos.some((v) => !v.completed)) ?? null

export const learningTotals = (courses: Course[]) => {
  const all = courses.map(courseStats)
  return {
    courses: courses.length,
    videos: all.reduce((sum, c) => sum + c.total, 0),
    completed: all.reduce((sum, c) => sum + c.completed, 0),
    watchedMinutes: all.reduce((sum, c) => sum + c.watchedMinutes, 0),
    remainingMinutes: all.reduce((sum, c) => sum + c.remainingMinutes, 0),
    percent:
      all.reduce((sum, c) => sum + c.total, 0) === 0
        ? 0
        : Math.round(
            (all.reduce((sum, c) => sum + c.completed, 0) /
              all.reduce((sum, c) => sum + c.total, 0)) *
              100
          ),
  }
}

export const goalProgress = (goal: Goal, tasks: Task[]) => {
  const linked = tasks.filter((t) => t.goalIds.includes(goal.id))
  const completed = linked.filter((t) => t.completed).length
  const total = linked.length
  const percent =
    total === 0 ? (goal.status === 'done' ? 100 : 0) : Math.round((completed / total) * 100)
  return { total, completed, percent }
}

export const overallScore = (state: {
  tasks: Task[]
  habits: Habit[]
  courses: Course[]
  studySessions: StudySession[]
}) => {
  const t = taskStats(state.tasks)
  const habitRates = state.habits.map((h) => habitStats(h).rate)
  const habitScore =
    habitRates.length === 0 ? 0 : habitRates.reduce((a, b) => a + b, 0) / habitRates.length
  const learning = learningTotals(state.courses).percent
  const week = lastNDays(7)
  const studyMinutes = state.studySessions
    .filter((s) => week.includes(s.date))
    .reduce((sum, s) => sum + s.minutes, 0)
  const studyScore = Math.min(100, Math.round((studyMinutes / (7 * 60)) * 100))
  return Math.round(t.rate * 0.35 + habitScore * 0.25 + learning * 0.2 + studyScore * 0.2)
}
