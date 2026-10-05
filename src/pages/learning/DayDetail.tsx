import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileCode2,
  Pencil,
  PlayCircle,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CodeFileDialog, VideoDialog } from '@/components/learning/LearningDialogs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { dayStats, nextIncompleteDay, orderedDays } from '@/lib/analytics'
import { formatDuration, formatDateTime } from '@/lib/date'
import { useStore } from '@/store/useStore'
import type { CodeFile, Video } from '@/types'

export default function DayDetail() {
  const { courseId = '', dayId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const focusVideoId = searchParams.get('video')

  const course = useStore((state) => state.courses.find((item) => item.id === courseId))
  const day = course?.days.find((item) => item.id === dayId)
  const toggleVideo = useStore((state) => state.toggleVideo)
  const moveVideo = useStore((state) => state.moveVideo)
  const removeVideo = useStore((state) => state.removeVideo)
  const removeCodeFile = useStore((state) => state.removeCodeFile)

  const [videoDialog, setVideoDialog] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [fileDialog, setFileDialog] = useState(false)
  const [editingFile, setEditingFile] = useState<CodeFile | null>(null)
  const [pendingVideo, setPendingVideo] = useState<Video | null>(null)
  const [pendingFile, setPendingFile] = useState<CodeFile | null>(null)

  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({})

  useEffect(() => {
    if (!focusVideoId) return
    const node = rowRefs.current[focusVideoId]
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusVideoId, dayId, day?.videos.length])

  if (!course || !day) {
    return (
      <EmptyState
        icon={FileCode2}
        title="Day not found"
        description="This day may have been deleted."
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

  const stats = dayStats(day.videos)
  const days = orderedDays(course)
  const index = days.findIndex((item) => item.id === day.id)
  const previous = index > 0 ? days[index - 1] : null
  const next = index >= 0 && index < days.length - 1 ? days[index + 1] : null
  const upcoming = nextIncompleteDay(course)

  const markAll = (completed: boolean) =>
    day.videos
      .filter((video) => video.completed !== completed)
      .forEach((video) => toggleVideo(course.id, day.id, video.id))

  return (
    <div className="space-y-5">
      <Link
        to={`/learning/${course.id}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {course.title}
      </Link>

      <PageHeader
        title={`Day ${day.order} · ${day.title}`}
        description={day.description || 'No description for this day yet.'}
        actions={
          <>
            <Button variant="outline" onClick={() => markAll(true)} disabled={day.videos.length === 0}>
              <CheckCircle2 className="h-4 w-4" /> Mark all
            </Button>
            <Button variant="outline" onClick={() => markAll(false)} disabled={stats.completed === 0}>
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
            <Button
              onClick={() => {
                setEditingVideo(null)
                setVideoDialog(true)
              }}
            >
              <Plus className="h-4 w-4" /> Add video
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="sky">{stats.total} videos</Badge>
        <Badge tone="green">{stats.completed} completed</Badge>
        <Badge tone="slate">{formatDuration(stats.minutes)} watched</Badge>
        {day.codeFiles.length > 0 ? <Badge tone="violet">{day.codeFiles.length} code files</Badge> : null}
      </div>

      <Card className="p-4">
        <ProgressBar value={stats.percent} color={course.color} height={10} showLabel label={`Day ${day.order} progress`} />
      </Card>

      <Card>
        <CardHeader
          title="Videos"
          description="Tick each video as you finish it — progress updates everywhere instantly."
        />
        <CardBody>
          {day.videos.length === 0 ? (
            <EmptyState
              icon={PlayCircle}
              title="No videos in this day"
              description="Add the lectures, tutorials or talks you plan to watch."
              action={
                <Button onClick={() => setVideoDialog(true)}>
                  <Plus className="h-4 w-4" /> Add video
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {day.videos.map((video, videoIndex) => {
                const focused = focusVideoId === video.id
                return (
                  <li
                    key={video.id}
                    ref={(node) => {
                      rowRefs.current[video.id] = node
                    }}
                    className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                      focused
                        ? 'border-brand-400 bg-brand-50/60 ring-2 ring-brand-400/40 dark:border-brand-500 dark:bg-brand-500/10'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      aria-label={video.completed ? `Mark ${video.title} incomplete` : `Mark ${video.title} complete`}
                      aria-pressed={video.completed}
                      onClick={() => toggleVideo(course.id, day.id, video.id)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        video.completed
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 hover:border-brand-500 dark:border-slate-600'
                      }`}
                    >
                      {video.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                    </button>

                    <div className="min-w-[180px] flex-1">
                      <p
                        className={`text-sm font-medium ${
                          video.completed
                            ? 'text-slate-500 line-through dark:text-slate-400'
                            : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {video.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{formatDuration(video.duration)}</span>
                        {video.completedAt ? <span>· done {formatDateTime(video.completedAt)}</span> : null}
                      </div>
                    </div>

                    {video.url ? (
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                      >
                        Watch <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Move ${video.title} up`}
                        disabled={videoIndex === 0}
                        onClick={() => moveVideo(course.id, day.id, video.id, -1)}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Move ${video.title} down`}
                        disabled={videoIndex === day.videos.length - 1}
                        onClick={() => moveVideo(course.id, day.id, video.id, 1)}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${video.title}`}
                        onClick={() => {
                          setEditingVideo(video)
                          setVideoDialog(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${video.title}`}
                        onClick={() => setPendingVideo(video)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Code files"
          description="Keep the notebook or solution for this day next to the theory."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingFile(null)
                setFileDialog(true)
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add file
            </Button>
          }
        />
        <CardBody>
          {day.codeFiles.length === 0 ? (
            <EmptyState
              icon={FileCode2}
              title="No code files yet"
              description="Paste a script, notebook snippet or solution to keep it with the lesson."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {day.codeFiles.map((file) => (
                <div key={file.id} className="rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {file.language} · updated {formatDateTime(file.updatedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${file.name}`}
                        onClick={() => {
                          setEditingFile(file)
                          setFileDialog(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${file.name}`}
                        onClick={() => setPendingFile(file)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                  <pre className="max-h-48 overflow-auto p-3 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    <code>{file.content || '// empty file'}</code>
                  </pre>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {previous ? (
              <Link to={`/learning/${course.id}/day/${previous.id}`}>
                <Button variant="outline" size="sm">
                  <ChevronLeft className="h-4 w-4" /> Day {previous.order}
                </Button>
              </Link>
            ) : null}
            {next ? (
              <Link to={`/learning/${course.id}/day/${next.id}`}>
                <Button variant="outline" size="sm">
                  Day {next.order} <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}
          </div>
          {upcoming ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Next incomplete day:{' '}
              <Link
                to={`/learning/${course.id}/day/${upcoming.id}`}
                className="font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Day {upcoming.order} · {upcoming.title}
              </Link>
            </p>
          ) : (
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              All days in this course are complete.
            </p>
          )}
        </div>
      </Card>

      <VideoDialog
        open={videoDialog}
        onClose={() => setVideoDialog(false)}
        courseId={course.id}
        dayId={day.id}
        video={editingVideo}
      />
      <CodeFileDialog
        open={fileDialog}
        onClose={() => setFileDialog(false)}
        courseId={course.id}
        dayId={day.id}
        file={editingFile}
      />

      <ConfirmDialog
        open={Boolean(pendingVideo)}
        title="Delete video"
        message={`"${pendingVideo?.title ?? ''}" will be removed and the day's progress recalculated.`}
        onCancel={() => setPendingVideo(null)}
        onConfirm={() => {
          if (pendingVideo) removeVideo(course.id, day.id, pendingVideo.id)
          setPendingVideo(null)
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingFile)}
        title="Delete code file"
        message={`"${pendingFile?.name ?? ''}" will be permanently removed.`}
        onCancel={() => setPendingFile(null)}
        onConfirm={() => {
          if (pendingFile) removeCodeFile(course.id, day.id, pendingFile.id)
          setPendingFile(null)
        }}
      />
    </div>
  )
}
