import { Activity, BookOpen, CheckCircle2, Flame, Github, GraduationCap, ListChecks, Target } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatCard } from '@/components/ui/StatCard'
import {
  cpStats,
  courseStats,
  githubStats,
  githubTrend,
  goalProgress,
  habitStats,
  learningTotals,
  leetcodeStats,
  leetcodeTrend,
  overallScore,
  studyTotals,
  studyTrend,
  taskStats,
  taskTrend,
} from '@/lib/analytics'
import { formatDuration } from '@/lib/date'
import { useStore } from '@/store/useStore'

const DIFFICULTY_COLORS: Record<string, string> = { Easy: '#10b981', Medium: '#f59e0b', Hard: '#ef4444' }

export default function Analytics() {
  const tasks = useStore((state) => state.tasks)
  const habits = useStore((state) => state.habits)
  const courses = useStore((state) => state.courses)
  const sessions = useStore((state) => state.studySessions)
  const leetcode = useStore((state) => state.leetcode)
  const cp = useStore((state) => state.cp)
  const github = useStore((state) => state.github)
  const goals = useStore((state) => state.goals)

  const taskSummary = taskStats(tasks)
  const learning = learningTotals(courses)
  const study = studyTotals(sessions)
  const score = overallScore({ tasks, habits, courses, studySessions: sessions })
  const lc = leetcodeStats(leetcode)
  const cpSummary = cpStats(cp)
  const gh = githubStats(github)

  const habitRows = habits
    .map((habit) => ({ habit, stats: habitStats(habit) }))
    .sort((a, b) => b.stats.streak - a.stats.streak)

  const habitConsistency =
    habitRows.length === 0
      ? 0
      : Math.round(habitRows.reduce((sum, row) => sum + row.stats.rate, 0) / habitRows.length)

  const trendData = taskTrend(tasks, 14).map((point, index) => ({
    label: point.label,
    tasks: point.value,
    study: studyTrend(sessions, 14)[index]?.value ?? 0,
  }))

  const difficultyData = lc.byDifficulty.map((row) => ({
    name: row.difficulty,
    solved: row.solved,
    open: row.total - row.solved,
  }))

  const lcTrend = leetcodeTrend(leetcode, 21)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        description="How the whole system is trending — tasks, habits, learning and practice."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Overall score" value={score} hint="Weighted across all modules" icon={Activity} tone="text-brand-600 dark:text-brand-400" />
        <StatCard label="Task completion" value={`${taskSummary.rate}%`} hint={`${taskSummary.completed}/${taskSummary.total} tasks`} icon={CheckCircle2} tone="text-emerald-500" />
        <StatCard label="Habit consistency" value={`${habitConsistency}%`} hint="Average over 30 days" icon={Flame} tone="text-amber-500" />
        <StatCard label="Learning progress" value={`${learning.percent}%`} hint={`${learning.completed}/${learning.videos} videos`} icon={GraduationCap} tone="text-violet-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Activity" description="Tasks completed and minutes studied, last 14 days" />
          <CardBody>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="tasks" name="Tasks completed" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="study" name="Minutes studied" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Study" description="Where the hours went" />
          <CardBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{formatDuration(study.minutes)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">This week</p>
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{formatDuration(study.weekMinutes)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Sessions logged</span>
                <span className="tabular-nums">{study.sessions}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Active days</span>
                <span className="tabular-nums">{study.activeDays}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Average per active day</span>
                <span className="tabular-nums">{formatDuration(study.avgPerActiveDay)}</span>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="label">Learning time</p>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Watched</span>
                <span className="tabular-nums">{formatDuration(learning.watchedMinutes)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Remaining</span>
                <span className="tabular-nums">{formatDuration(learning.remainingMinutes)}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Habits" description="Streaks, best runs and 30-day consistency" />
        <CardBody>
          {habitRows.length === 0 ? (
            <EmptyState icon={Flame} title="No habits tracked" description="Add a habit to see consistency here." />
          ) : (
            <div className="space-y-4">
              {habitRows.map(({ habit, stats }) => (
                <div key={habit.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: habit.color }} />
                      {habit.name}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone="amber">
                        <Flame className="h-3 w-3" /> {stats.streak} current
                      </Badge>
                      <Badge tone="slate">best {stats.longest}</Badge>
                      <Badge tone="green">{stats.rate}% / 30d</Badge>
                      <Badge tone="sky">{stats.total} total</Badge>
                    </div>
                  </div>
                  <ProgressBar value={stats.rate} color={habit.color} className="mt-2" label={`${habit.name} 30 day consistency`} />
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="LeetCode" description={`${lc.solved}/${lc.total} problems solved`} />
          <CardBody className="space-y-4">
            {lc.total === 0 ? (
              <EmptyState icon={ListChecks} title="No problems logged" description="Add problems to see difficulty breakdown." />
            ) : (
              <>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={difficultyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="solved" name="Solved" stackId="a" radius={[0, 0, 0, 0]}>
                        {difficultyData.map((row) => (
                          <Cell key={row.name} fill={DIFFICULTY_COLORS[row.name]} />
                        ))}
                      </Bar>
                      <Bar dataKey="open" name="Open" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lcTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval={3} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={10} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" name="Solved" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Competitive & GitHub" description="Practice and shipping signals" />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">CP solved</p>
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{cpSummary.solved}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">Avg rating</p>
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{cpSummary.avgRating || '—'}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">Commits</p>
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{gh.commits}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">PRs</p>
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{gh.prs}</p>
              </div>
            </div>

            {github.length === 0 ? (
              <EmptyState icon={Github} title="No GitHub activity" description="Log contributions to see the trend." />
            ) : (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={githubTrend(github, 30)} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval={4} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={10} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" name="Commits" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Course progress" description="Every course you are tracking" />
          <CardBody className="space-y-4">
            {courses.length === 0 ? (
              <EmptyState icon={GraduationCap} title="No courses" description="Create a course to track learning." />
            ) : (
              courses.map((course) => {
                const stats = courseStats(course)
                return (
                  <div key={course.id}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{course.title}</span>
                      <span className="tabular-nums text-slate-500 dark:text-slate-400">
                        {stats.completed}/{stats.total} · {stats.percent}%
                      </span>
                    </div>
                    <ProgressBar value={stats.percent} color={course.color} className="mt-1.5" label={`${course.title} progress`} />
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {stats.days} days · {stats.watchedLabel} watched · {stats.remainingLabel} left
                    </p>
                  </div>
                )
              })
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Goal progress" description="Driven by linked tasks" />
          <CardBody className="space-y-4">
            {goals.length === 0 ? (
              <EmptyState icon={Target} title="No goals" description="Create a goal and link tasks to it." />
            ) : (
              goals.map((goal) => {
                const progress = goalProgress(goal, tasks)
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-slate-700 dark:text-slate-200">{goal.title}</span>
                      <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
                        {progress.completed}/{progress.total} · {progress.percent}%
                      </span>
                    </div>
                    <ProgressBar
                      value={progress.percent}
                      color={goal.status === 'done' ? '#10b981' : '#6366f1'}
                      className="mt-1.5"
                      label={`${goal.title} progress`}
                    />
                  </div>
                )
              })
            )}
            <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <BookOpen className="h-3.5 w-3.5" />
                {taskSummary.open} open tasks · {taskSummary.overdue} overdue · {habitRows.length} habits tracked
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
