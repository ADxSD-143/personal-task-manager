export type ID = string

export type Theme = 'light' | 'dark' | 'system'

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: ID
  title: string
  description: string
  completed: boolean
  priority: Priority
  tags: string[]
  dueDate: string | null
  goalIds: ID[]
  projectId: ID | null
  createdAt: string
  completedAt: string | null
}

export interface Habit {
  id: ID
  name: string
  description: string
  color: string
  frequency: 'daily' | 'weekly'
  /** For daily habits this is 1. For weekly habits it is the number of days per week that count as a full period. */
  targetPerPeriod: number
  /** Distinct completion dates, formatted yyyy-MM-dd. */
  completions: string[]
  createdAt: string
}

export interface Video {
  id: ID
  title: string
  url: string
  duration: number
  completed: boolean
  completedAt: string | null
}

export interface CodeFile {
  id: ID
  name: string
  language: string
  content: string
  updatedAt: string
}

export interface CourseDay {
  id: ID
  title: string
  description: string
  order: number
  videos: Video[]
  codeFiles: CodeFile[]
}

export interface Course {
  id: ID
  title: string
  description: string
  category: string
  color: string
  days: CourseDay[]
  createdAt: string
}

export interface Subject {
  id: ID
  name: string
  color: string
  createdAt: string
}

export interface StudySession {
  id: ID
  subjectId: ID
  date: string
  minutes: number
  notes: string
  createdAt: string
}

export interface WorkoutExercise {
  id: ID
  name: string
  sets: number
  reps: number
  weightKg: number | null
  durationMinutes: number | null
  notes: string
}

export interface Workout {
  id: ID
  title: string
  date: string
  notes: string
  completed: boolean
  exercises: WorkoutExercise[]
  createdAt: string
}

export interface Note {
  id: ID
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface GoalMilestone {
  id: ID
  title: string
  completed: boolean
  completedAt: string | null
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard'
export type SolveStatus = 'todo' | 'solved' | 'review'

export interface LeetCodeRecord {
  id: ID
  title: string
  difficulty: Difficulty
  topics: string[]
  status: SolveStatus
  url: string
  date: string
  notes: string
  createdAt: string
}

export interface CPRecord {
  id: ID
  platform: string
  title: string
  rating: number | null
  topic: string
  status: SolveStatus
  url: string
  date: string
  notes: string
  createdAt: string
}

export interface GitHubContribution {
  id: ID
  repo: string
  date: string
  commits: number
  prs: number
  issues: number
  notes: string
  createdAt: string
}

export interface Project {
  id: ID
  name: string
  description: string
  status: 'idea' | 'active' | 'paused' | 'done'
  techStack: string[]
  repoUrl: string
  liveUrl: string
  createdAt: string
}

export interface Goal {
  id: ID
  title: string
  description: string
  category: string
  targetDate: string | null
  status: 'active' | 'done'
  milestones?: GoalMilestone[]
  createdAt: string
}

export interface Settings {
  theme: Theme
  weekStartsOn: 0 | 1
}

export interface Profile {
  name: string
  tagline: string
}

export interface DataState {
  profile: Profile
  settings: Settings
  tasks: Task[]
  habits: Habit[]
  courses: Course[]
  subjects: Subject[]
  studySessions: StudySession[]
  workouts: Workout[]
  notes: Note[]
  leetcode: LeetCodeRecord[]
  cp: CPRecord[]
  github: GitHubContribution[]
  projects: Project[]
  goals: Goal[]
}

export interface SearchResult {
  id: string
  type: string
  title: string
  subtitle: string
  path: string
}
