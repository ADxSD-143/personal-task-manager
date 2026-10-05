import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  GraduationCap,
  Layers,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CourseDialog, DayDialog } from '@/components/learning/LearningDialogs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatCard } from '@/components/ui/StatCard'
import { courseStats, dayStats, nextIncompleteLesson, orderedDays } from '@/lib/analytics'
import { useStore } from '@/store/useStore'
import type { CourseDay } from '@/types'

export default function CourseDetail() {
  const { courseId = '' } = useParams()
  const course = useStore((state) => state.courses.find((item) => item.id === courseId))
  const moveDay = useStore((state) => state.moveDay)
  const removeDay = useStore((state) => state.removeDay)

  const [courseDialog, setCourseDialog] = useState(false)
  const [dayDialog, setDayDialog] = useState(false)
  const [editingDay, setEditingDay] = useState<CourseDay | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CourseDay | null>(null)

  if (!course) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Course not found"
        description="It may have been deleted. Head back to the course list."
        action={
          <Link to="/learning">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" /> Back to courses
            </Button>
          </Link>
        }
      />
    )
  }

  const stats = courseStats(course)
  const days = orderedDays(course)
  const next = nextIncompleteLesson([course], course.id)
  const nextDay = next ? days.find((day) => day.id === next.dayId) ?? null : null

  return (
    <div className="space-y-5">
      <Link
        to="/learning"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All courses
      </Link>

      <PageHeader
        title={course.title}
        description={course.description || 'No description yet.'}
        actions={
          <>
            <Button variant="outline" onClick={() => setCourseDialog(true)}>
              <Pencil className="h-4 w-4" /> Edit course
            </Button>
            <Button
              onClick={() => {
                setEditingDay(null)
                setDayDialog(true)
              }}
            >
              <Plus className="h-4 w-4" /> Add day
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        <Badge tone="brand">{course.category}</Badge>
        <Badge tone="slate">{stats.days} days</Badge>
        <Badge tone="sky">{stats.total} videos</Badge>
        <Badge tone="green">{stats.completed} completed</Badge>
        {stats.codeFiles > 0 ? <Badge tone="violet">{stats.codeFiles} code files</Badge> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Progress" value={`${stats.percent}%`} hint={`${stats.completed}/${stats.total} videos`} icon={GraduationCap} />
        <StatCard label="Days" value={stats.days} hint="Lessons in this course" icon={Layers} />
        <StatCard label="Watched" value={stats.watchedLabel} hint="Time on completed videos" icon={Clock} tone="text-emerald-500" />
        <StatCard label="Remaining" value={stats.remainingLabel} hint="Still to watch" icon={Clock} tone="text-amber-500" />
      </div>

      <Card className="p-4">
        <ProgressBar value={stats.percent} color={course.color} height={10} showLabel label={`${course.title} progress`} />
      </Card>

      {next && nextDay ? (
        <Card className="border-brand-200 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/10">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                Next up
              </p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                Day {nextDay.order} · {next.videoTitle}
              </p>
            </div>
            <Link to={`/learning/${course.id}/day/${nextDay.id}?video=${next.videoId}`}>
              <Button size="sm">
                <PlayCircle className="h-4 w-4" /> Continue
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Every video in this course is complete. Nice work.
          </p>
        </Card>
      )}

      <Card>
        <CardHeader title="Days" description="Reorder days with the arrows" />
        <CardBody className="space-y-2">
          {days.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No days yet"
              description="Add the first day to start building this course."
              action={
                <Button onClick={() => setDayDialog(true)}>
                  <Plus className="h-4 w-4" /> Add day
                </Button>
              }
            />
          ) : (
            days.map((day, index) => {
              const dayStatsFor = dayStats(day.videos)
              const isNext = nextDay?.id === day.id
              return (
                <div
                  key={day.id}
                  className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                    isNext
                      ? 'border-brand-300 bg-brand-50/50 dark:border-brand-500/40 dark:bg-brand-500/5'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {day.order}
                  </span>

                  <div className="min-w-[160px] flex-1">
                    <Link
                      to={`/learning/${course.id}/day/${day.id}`}
                      className="text-sm font-medium text-slate-800 hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-400"
                    >
                      {day.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {dayStatsFor.completed}/{dayStatsFor.total} videos
                      </span>
                      {day.codeFiles.length > 0 ? (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{day.codeFiles.length} files</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="w-32">
                    <ProgressBar value={dayStatsFor.percent} color={course.color} label={`Day ${day.order} progress`} />
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move day ${day.order} up`}
                      disabled={index === 0}
                      onClick={() => moveDay(course.id, day.id, -1)}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Move day ${day.order} down`}
                      disabled={index === days.length - 1}
                      onClick={() => moveDay(course.id, day.id, 1)}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit day ${day.order}`}
                      onClick={() => {
                        setEditingDay(day)
                        setDayDialog(true)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete day ${day.order}`}
                      onClick={() => setPendingDelete(day)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardBody>
      </Card>

      <CourseDialog open={courseDialog} onClose={() => setCourseDialog(false)} course={course} />
      <DayDialog
        open={dayDialog}
        onClose={() => setDayDialog(false)}
        courseId={course.id}
        day={editingDay}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete day"
        message={`Day ${pendingDelete?.order ?? ''} "${pendingDelete?.title ?? ''}" and its ${
          pendingDelete?.videos.length ?? 0
        } video(s) and ${pendingDelete?.codeFiles.length ?? 0} code file(s) will be permanently removed.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeDay(course.id, pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
