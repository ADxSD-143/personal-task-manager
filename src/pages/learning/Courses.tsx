import { GraduationCap, PlayCircle, Plus, Pencil, Trash2, Clock, Layers } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CourseDialog } from '@/components/learning/LearningDialogs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatCard } from '@/components/ui/StatCard'
import { courseStats, learningTotals, nextIncompleteLesson } from '@/lib/analytics'
import { formatDuration } from '@/lib/date'
import { useStore } from '@/store/useStore'
import type { Course } from '@/types'

export default function Courses() {
  const courses = useStore((state) => state.courses)
  const removeCourse = useStore((state) => state.removeCourse)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Course | null>(null)

  const resume = nextIncompleteLesson(courses)
  const totals = learningTotals(courses)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Courses"
        description="Structured learning, one day at a time. Mark videos complete to track progress."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> New course
          </Button>
        }
      />

      {resume ? (
        <Card className="overflow-hidden border-brand-200 bg-gradient-to-r from-brand-50 to-white dark:border-brand-500/30 dark:from-brand-500/10 dark:to-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                Continue learning
              </p>
              <p className="mt-1 truncate text-base font-semibold text-slate-900 dark:text-slate-50">
                Day {resume.dayOrder} · {resume.videoTitle}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {resume.courseTitle} › {resume.dayTitle}
              </p>
            </div>
            <Link to={`/learning/${resume.courseId}/day/${resume.dayId}?video=${resume.videoId}`}>
              <Button>
                <PlayCircle className="h-4 w-4" /> Resume
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Courses" value={totals.courses} hint="Tracked end to end" icon={Layers} />
        <StatCard
          label="Videos"
          value={`${totals.completed}/${totals.videos}`}
          hint={`${totals.percent}% complete`}
          icon={PlayCircle}
          tone="text-violet-500"
        />
        <StatCard
          label="Time watched"
          value={formatDuration(totals.watchedMinutes)}
          hint="Completed videos only"
          icon={Clock}
          tone="text-emerald-500"
        />
        <StatCard
          label="Remaining"
          value={formatDuration(totals.remainingMinutes)}
          hint="At your current pace"
          icon={GraduationCap}
          tone="text-amber-500"
        />
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No courses yet"
          description="Create a course, add days and list the videos you want to get through."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> New course
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const stats = courseStats(course)
            const next = nextIncompleteLesson(courses, course.id)
            return (
              <Card key={course.id} className="flex flex-col">
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: course.color }} />
                      {course.title}
                    </span>
                  }
                  description={course.description || 'No description'}
                  action={
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${course.title}`}
                        onClick={() => {
                          setEditing(course)
                          setDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${course.title}`}
                        onClick={() => setPendingDelete(course)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </div>
                  }
                />
                <CardBody className="flex flex-1 flex-col gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="brand">{course.category}</Badge>
                    <Badge tone="slate">{stats.days} days</Badge>
                    <Badge tone="sky">{stats.total} videos</Badge>
                    {stats.codeFiles > 0 ? <Badge tone="violet">{stats.codeFiles} files</Badge> : null}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {stats.completed}/{stats.total} videos
                      </span>
                      <span className="tabular-nums">{stats.percent}%</span>
                    </div>
                    <ProgressBar value={stats.percent} color={course.color} className="mt-1.5" />
                  </div>

                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
                      <dt className="text-slate-500 dark:text-slate-400">Watched</dt>
                      <dd className="font-medium text-slate-700 dark:text-slate-200">{stats.watchedLabel}</dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
                      <dt className="text-slate-500 dark:text-slate-400">Remaining</dt>
                      <dd className="font-medium text-slate-700 dark:text-slate-200">{stats.remainingLabel}</dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex flex-wrap gap-2">
                    <Link to={`/learning/${course.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        Open course
                      </Button>
                    </Link>
                    {next ? (
                      <Link to={`/learning/${course.id}/day/${next.dayId}?video=${next.videoId}`} className="flex-1">
                        <Button className="w-full">
                          <PlayCircle className="h-4 w-4" /> Continue
                        </Button>
                      </Link>
                    ) : (
                      <Badge tone="green" className="self-center px-3 py-1">
                        Completed
                      </Badge>
                    )}
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <CourseDialog open={dialogOpen} onClose={() => setDialogOpen(false)} course={editing} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete course"
        message={`"${pendingDelete?.title ?? ''}" and all of its days, videos and code files will be permanently removed.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeCourse(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
