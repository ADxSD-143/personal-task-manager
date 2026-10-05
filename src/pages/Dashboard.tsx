import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Flame,
  GraduationCap,
  ListTodo,
  PlayCircle,
  Target,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge, PRIORITY_TONE } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatCard } from '@/components/ui/StatCard'
import {
  goalProgress,
  habitStats,
  learningTotals,
  nextIncompleteLesson,
  overallScore,
  studyTotals,
  taskStats,
  taskTrend,
} from '@/lib/analytics'
import { formatDate, formatDuration, relativeDay, todayKey } from '@/lib/date'
import { isCompletedToday } from '@/lib/streak'
import { useStore } from '@/store/useStore'

const greeting = (): string => {
  const hour = new Date().getHours()
  if (hour < 5) return 'Still up'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function ScoreRing({ score }: { score: number }) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="8" className="stroke-slate-200 dark:stroke-slate-800" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke="#6366f1"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">{score}</span>
        <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">score</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const state = useStore()
  const tasks = state.tasks
  const habits = state.habits
  const courses = state.courses
  const sessions = state.studySessions

  const stats = taskStats(tasks)
  const learning = learningTotals(courses)
  const study = studyTotals(sessions)
  const resume = nextIncompleteLesson(courses)
  const trend = taskTrend(tasks, 14)
  const score = overallScore({ tasks, habits, courses, studySessions: sessions })

  const today = todayKey()
  const todaysTasks = tasks
    .filter((task) => !task.completed && (!task.dueDate || task.dueDate <= today))
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
    .slice(0, 5)

  const activeGoals = state.goals.filter((goal) => goal.status === 'active').slice(0, 4)

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-6 p-5">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {greeting()}, {state.profile.name.replace(/^My /, '')}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
              {stats.open === 0
                ? 'No open tasks. Use the free time to push a project forward.'
                : `${stats.open} open task${stats.open === 1 ? '' : 's'}${
                    stats.overdue ? ` · ${stats.overdue} overdue` : ''
                  } · ${stats.completed} completed`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {resume ? (
                <Link to={`/learning/${resume.courseId}/day/${resume.dayId}`}>
                  <Button size="sm">
                    <PlayCircle className="h-4 w-4" /> Continue learning
                  </Button>
                </Link>
              ) : (
                <Link to="/learning">
                  <Button size="sm" variant="secondary">
                    <GraduationCap className="h-4 w-4" /> Browse courses
                  </Button>
                </Link>
              )}
              <Link to="/tasks">
                <Button size="sm" variant="outline">
                  <ListTodo className="h-4 w-4" /> Open tasks
                </Button>
              </Link>
            </div>
          </div>
          <ScoreRing score={score} />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tasks completed"
          value={`${stats.completed}/${stats.total}`}
          hint={`${stats.rate}% completion rate`}
          icon={CheckCircle2}
        />
        <StatCard
          label="Habits today"
          value={`${habits.filter((habit) => isCompletedToday(habit, today)).length}/${habits.length}`}
          hint={`${habits.filter((habit) => habitStats(habit).streak > 0).length} active streaks`}
          icon={Flame}
          tone="text-amber-500"
        />
        <StatCard
          label="Course progress"
          value={`${learning.percent}%`}
          hint={`${learning.completed}/${learning.videos} videos watched`}
          icon={GraduationCap}
          tone="text-violet-500"
        />
        <StatCard
          label="Study this week"
          value={formatDuration(study.weekMinutes)}
          hint={`${formatDuration(study.minutes)} logged all time`}
          icon={BookOpen}
          tone="text-sky-500"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Due today & overdue"
            description="The shortest path to a productive day"
            action={
              <Link to="/tasks" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                View all
              </Link>
            }
          />
          <CardBody className="space-y-2">
            {todaysTasks.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Nothing due today"
                description="Plan ahead by adding a due date to your tasks."
                action={
                  <Link to="/tasks">
                    <Button size="sm" variant="outline">
                      Go to tasks
                    </Button>
                  </Link>
                }
              />
            ) : (
              todaysTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
                >
                  <button
                    type="button"
                    aria-label={`Complete ${task.title}`}
                    onClick={() => state.toggleTask(task.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-slate-300 transition hover:border-brand-500 dark:border-slate-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {task.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {task.dueDate ? relativeDay(task.dueDate) : 'No due date'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Habits"
            description="Tick them off as you go"
            action={
              <Link to="/habits" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                Manage
              </Link>
            }
          />
          <CardBody className="space-y-2">
            {habits.length === 0 ? (
              <EmptyState icon={Flame} title="No habits yet" description="Build your first streak." />
            ) : (
              habits.map((habit) => {
                const done = isCompletedToday(habit, today)
                const statsForHabit = habitStats(habit)
                return (
                  <div
                    key={habit.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: habit.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {habit.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {statsForHabit.streak} streak · {statsForHabit.rate}% last 30 days
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={done ? 'primary' : 'outline'}
                      onClick={() => state.toggleHabitDate(habit.id, today)}
                    >
                      {done ? 'Done' : 'Log'}
                    </Button>
                  </div>
                )
              })
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Task completions" description="Last 14 days" />
          <CardBody>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
                    formatter={(value: number) => [`${value} completed`, 'Tasks']}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Goals"
            description="Progress from linked tasks"
            action={
              <Link to="/goals" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                All goals
              </Link>
            }
          />
          <CardBody className="space-y-4">
            {activeGoals.length === 0 ? (
              <EmptyState icon={Target} title="No active goals" description="Set a direction for your tasks." />
            ) : (
              activeGoals.map((goal) => {
                const progress = goalProgress(goal, tasks)
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {goal.title}
                      </p>
                      <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {progress.completed}/{progress.total}
                      </span>
                    </div>
                    <ProgressBar value={progress.percent} className="mt-2" label={`${goal.title} progress`} />
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <CalendarClock className="h-3 w-3" />
                      {goal.targetDate ? `Due ${formatDate(goal.targetDate)}` : 'No target date'}
                    </p>
                  </div>
                )
              })
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Learning"
          description={`${learning.videos} videos · ${formatDuration(learning.remainingMinutes)} remaining`}
          action={
            <Link
              to="/learning"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Courses <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          {courses.slice(0, 4).map((course) => {
            const statsForCourse = learningTotals([course])
            return (
              <Link
                key={course.id}
                to={`/learning/${course.id}`}
                className="rounded-lg border border-slate-200 p-3 transition hover:border-brand-400 hover:shadow-sm dark:border-slate-800 dark:hover:border-brand-500"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {course.title}
                  </p>
                  <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {statsForCourse.percent}%
                  </span>
                </div>
                <ProgressBar value={statsForCourse.percent} color={course.color} className="mt-2" label={`${course.title} progress`} />
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  {statsForCourse.completed}/{statsForCourse.videos} videos · {course.days.length} days
                </p>
              </Link>
            )
          })}
          {courses.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No courses yet" description="Add a course to track your learning." />
          ) : null}
        </CardBody>
      </Card>
    </div>
  )
}
