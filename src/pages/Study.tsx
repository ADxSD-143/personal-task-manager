import { BookOpen, Clock, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatCard } from '@/components/ui/StatCard'
import { studyBySubject, studyTotals, studyTrend } from '@/lib/analytics'
import { formatDate, formatDuration, lastNDays, todayKey } from '@/lib/date'
import { matchesQuery } from '@/lib/search'
import { useStore } from '@/store/useStore'
import type { StudySession, Subject } from '@/types'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#ec4899']

function SubjectDialog({
  open,
  onClose,
  subject,
}: {
  open: boolean
  onClose: () => void
  subject?: Subject | null
}) {
  const addSubject = useStore((state) => state.addSubject)
  const updateSubject = useStore((state) => state.updateSubject)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [error, setError] = useState('')
  const [key, setKey] = useState<string | null>(null)

  const currentKey = `${subject?.id ?? 'new'}-${open}`
  if (key !== currentKey) {
    setKey(currentKey)
    setName(subject?.name ?? '')
    setColor(subject?.color ?? COLORS[0])
    setError('')
  }

  const submit = () => {
    if (!name.trim()) {
      setError('A name is required.')
      return
    }
    if (subject) updateSubject(subject.id, { name: name.trim(), color })
    else addSubject({ name: name.trim(), color })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={subject ? 'Edit subject' : 'New subject'}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{subject ? 'Save' : 'Add subject'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" error={error}>
          <TextInput value={name} autoFocus onChange={(e) => setName(e.target.value)} placeholder="e.g. Machine Learning" />
        </Field>
        <Field label="Colour">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`Colour ${value}`}
                aria-pressed={color === value}
                onClick={() => setColor(value)}
                className={`h-7 w-7 rounded-full ring-2 ring-offset-2 transition dark:ring-offset-slate-900 ${
                  color === value ? 'ring-slate-900 dark:ring-white' : 'ring-transparent'
                }`}
                style={{ backgroundColor: value }}
              />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  )
}

function SessionDialog({
  open,
  onClose,
  session,
  subjects,
  defaultSubjectId,
}: {
  open: boolean
  onClose: () => void
  session?: StudySession | null
  subjects: Subject[]
  defaultSubjectId?: string
}) {
  const addStudySession = useStore((state) => state.addStudySession)
  const updateStudySession = useStore((state) => state.updateStudySession)
  const [subjectId, setSubjectId] = useState('')
  const [minutes, setMinutes] = useState('60')
  const [date, setDate] = useState(todayKey())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [key, setKey] = useState<string | null>(null)

  const currentKey = `${session?.id ?? 'new'}-${open}`
  if (key !== currentKey) {
    setKey(currentKey)
    setSubjectId(session?.subjectId ?? defaultSubjectId ?? subjects[0]?.id ?? '')
    setMinutes(String(session?.minutes ?? 60))
    setDate(session?.date ?? todayKey())
    setNotes(session?.notes ?? '')
    setError('')
  }

  const submit = () => {
    if (!subjectId) {
      setError('Pick a subject first.')
      return
    }
    const parsed = Number(minutes)
    if (!parsed || parsed <= 0) {
      setError('Enter a duration in minutes.')
      return
    }
    if (session) updateStudySession(session.id, { subjectId, minutes: Math.round(parsed), date, notes })
    else addStudySession({ subjectId, minutes: Math.round(parsed), date, notes })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={session ? 'Edit session' : 'Log study session'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{session ? 'Save changes' : 'Log session'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Subject" error={error}>
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Minutes">
            <TextInput type="number" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </Field>
        </div>
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Notes">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you cover?" />
        </Field>
      </div>
    </Modal>
  )
}

export default function Study() {
  const subjects = useStore((state) => state.subjects)
  const sessions = useStore((state) => state.studySessions)
  const removeStudySession = useStore((state) => state.removeStudySession)
  const removeSubject = useStore((state) => state.removeSubject)

  const [subjectDialog, setSubjectDialog] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [sessionDialog, setSessionDialog] = useState(false)
  const [editingSession, setEditingSession] = useState<StudySession | null>(null)
  const [pendingSession, setPendingSession] = useState<StudySession | null>(null)
  const [pendingSubject, setPendingSubject] = useState<Subject | null>(null)
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [query, setQuery] = useState('')

  const totals = studyTotals(sessions)
  const trend = studyTrend(sessions, 14)
  const bySubject = studyBySubject(sessions, subjects)
  const window30 = lastNDays(30)
  const minutes30 = sessions.filter((s) => window30.includes(s.date)).reduce((sum, s) => sum + s.minutes, 0)
  const maxSubjectMinutes = bySubject[0]?.minutes ?? 0

  const visible = useMemo(
    () =>
      sessions
        .filter((session) => subjectFilter === 'all' || session.subjectId === subjectFilter)
        .filter((session) => {
          const subject = subjects.find((item) => item.id === session.subjectId)
          return matchesQuery(query, session.notes, subject?.name, session.date)
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [sessions, subjectFilter, query, subjects]
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Study log"
        description="Record focused time so your effort is visible over weeks, not just days."
        actions={
          <>
            <Button variant="outline" onClick={() => setSubjectDialog(true)}>
              <Plus className="h-4 w-4" /> Subject
            </Button>
            <Button
              onClick={() => {
                setEditingSession(null)
                setSessionDialog(true)
              }}
              disabled={subjects.length === 0}
            >
              <Plus className="h-4 w-4" /> Log session
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total logged" value={formatDuration(totals.minutes)} hint={`${totals.sessions} sessions`} icon={Clock} />
        <StatCard label="This week" value={formatDuration(totals.weekMinutes)} hint="Last 7 days" icon={BookOpen} tone="text-sky-500" />
        <StatCard label="Last 30 days" value={formatDuration(minutes30)} hint="Rolling window" icon={Clock} tone="text-emerald-500" />
        <StatCard
          label="Avg / active day"
          value={formatDuration(totals.avgPerActiveDay)}
          hint={`${totals.activeDays} active days`}
          icon={BookOpen}
          tone="text-amber-500"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Study minutes" description="Last 14 days" />
          <CardBody>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [formatDuration(value), 'Studied']}
                  />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="By subject" description="All-time minutes" />
          <CardBody className="space-y-3">
            {bySubject.length === 0 ? (
              <EmptyState icon={BookOpen} title="No sessions yet" description="Log your first study session." />
            ) : (
              bySubject.map((row) => (
                <div key={row.subject}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{row.subject}</span>
                    <span className="tabular-nums text-slate-500 dark:text-slate-400">{formatDuration(row.minutes)}</span>
                  </div>
                  <ProgressBar
                    value={maxSubjectMinutes === 0 ? 0 : (row.minutes / maxSubjectMinutes) * 100}
                    color={row.color}
                    className="mt-1.5"
                    label={`${row.subject} share of study time`}
                  />
                </div>
              ))
            )}

            {subjects.length > 0 ? (
              <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                <p className="label">Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((subject) => (
                    <span
                      key={subject.id}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-xs dark:border-slate-700"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subject.color }} />
                      {subject.name}
                      <button
                        type="button"
                        aria-label={`Edit ${subject.name}`}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        onClick={() => {
                          setEditingSubject(subject)
                          setSubjectDialog(true)
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${subject.name}`}
                        className="text-slate-500 hover:text-rose-500 dark:text-slate-400"
                        onClick={() => setPendingSubject(subject)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Sessions"
          description={`${visible.length} of ${sessions.length} shown`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <TextInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search notes…"
                  className="w-44 pl-9"
                  aria-label="Search study sessions"
                />
              </div>
              <Select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                aria-label="Filter by subject"
                className="w-auto"
              >
                <option value="all">All subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </div>
          }
        />
        <CardBody>
          {visible.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No sessions match"
              description={sessions.length === 0 ? 'Log a session to start building your history.' : 'Try a different filter.'}
            />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {visible.map((session) => {
                const subject = subjects.find((item) => item.id === session.subjectId)
                return (
                  <li key={session.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: subject?.color ?? '#94a3b8' }} />
                    <div className="min-w-[160px] flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {subject?.name ?? 'Unknown subject'}
                      </p>
                      {session.notes ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{session.notes}</p>
                      ) : null}
                    </div>
                    <Badge tone="sky">{formatDuration(session.minutes)}</Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(session.date)}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit session"
                        onClick={() => {
                          setEditingSession(session)
                          setSessionDialog(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete session" onClick={() => setPendingSession(session)}>
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

      <SubjectDialog open={subjectDialog} onClose={() => setSubjectDialog(false)} subject={editingSubject} />
      <SessionDialog
        open={sessionDialog}
        onClose={() => setSessionDialog(false)}
        session={editingSession}
        subjects={subjects}
        defaultSubjectId={subjectFilter === 'all' ? undefined : subjectFilter}
      />

      <ConfirmDialog
        open={Boolean(pendingSession)}
        title="Delete session"
        message="This study session will be permanently removed."
        onCancel={() => setPendingSession(null)}
        onConfirm={() => {
          if (pendingSession) removeStudySession(pendingSession.id)
          setPendingSession(null)
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingSubject)}
        title="Delete subject"
        message={`"${pendingSubject?.name ?? ''}" and all of its study sessions will be permanently removed.`}
        onCancel={() => setPendingSubject(null)}
        onConfirm={() => {
          if (pendingSubject) removeSubject(pendingSubject.id)
          setPendingSubject(null)
        }}
      />
    </div>
  )
}
