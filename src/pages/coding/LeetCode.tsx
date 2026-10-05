import { ExternalLink, ListChecks, Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatCard } from '@/components/ui/StatCard'
import { leetcodeStats, leetcodeTrend } from '@/lib/analytics'
import { formatDate, todayKey } from '@/lib/date'
import { matchesQuery } from '@/lib/search'
import { useStore } from '@/store/useStore'
import type { Difficulty, LeetCodeRecord, SolveStatus } from '@/types'

export const DIFFICULTY_TONE: Record<Difficulty, 'green' | 'amber' | 'rose'> = {
  Easy: 'green',
  Medium: 'amber',
  Hard: 'rose',
}

const STATUS_LABEL: Record<SolveStatus, string> = {
  todo: 'To do',
  solved: 'Solved',
  review: 'Review',
}

function LeetCodeDialog({
  open,
  onClose,
  record,
}: {
  open: boolean
  onClose: () => void
  record?: LeetCodeRecord | null
}) {
  const addLeetCode = useStore((state) => state.addLeetCode)
  const updateLeetCode = useStore((state) => state.updateLeetCode)
  const [title, setTitle] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy')
  const [topics, setTopics] = useState('')
  const [status, setStatus] = useState<SolveStatus>('todo')
  const [url, setUrl] = useState('')
  const [date, setDate] = useState(todayKey())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [key, setKey] = useState<string | null>(null)

  const currentKey = `${record?.id ?? 'new'}-${open}`
  if (key !== currentKey) {
    setKey(currentKey)
    setTitle(record?.title ?? '')
    setDifficulty(record?.difficulty ?? 'Easy')
    setTopics((record?.topics ?? []).join(', '))
    setStatus(record?.status ?? 'todo')
    setUrl(record?.url ?? '')
    setDate(record?.date ?? todayKey())
    setNotes(record?.notes ?? '')
    setError('')
  }

  const submit = () => {
    if (!title.trim()) {
      setError('A problem name is required.')
      return
    }
    const payload = {
      title: title.trim(),
      difficulty,
      topics: topics
        .split(',')
        .map((topic) => topic.trim())
        .filter(Boolean),
      status,
      url: url.trim(),
      date,
      notes: notes.trim(),
    }
    if (record) updateLeetCode(record.id, payload)
    else addLeetCode(payload)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={record ? 'Edit problem' : 'Add problem'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{record ? 'Save changes' : 'Add problem'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Problem" error={error}>
          <TextInput value={title} autoFocus onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Longest Substring Without Repeating Characters" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Difficulty">
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as SolveStatus)}>
              <option value="todo">To do</option>
              <option value="solved">Solved</option>
              <option value="review">Needs review</option>
            </Select>
          </Field>
          <Field label="Date">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Topics" hint="Comma separated">
          <TextInput value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="Array, Sliding Window" />
        </Field>
        <Field label="Link">
          <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://leetcode.com/problems/…" />
        </Field>
        <Field label="Notes">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Key insight or complexity" />
        </Field>
      </div>
    </Modal>
  )
}

export default function LeetCode() {
  const records = useStore((state) => state.leetcode)
  const updateLeetCode = useStore((state) => state.updateLeetCode)
  const removeLeetCode = useStore((state) => state.removeLeetCode)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LeetCodeRecord | null>(null)
  const [pendingDelete, setPendingDelete] = useState<LeetCodeRecord | null>(null)
  const [status, setStatus] = useState<'all' | SolveStatus>('all')
  const [difficulty, setDifficulty] = useState<'all' | Difficulty>('all')
  const [query, setQuery] = useState('')

  const stats = leetcodeStats(records)
  const trend = leetcodeTrend(records, 14)

  const visible = useMemo(
    () =>
      records
        .filter((record) => status === 'all' || record.status === status)
        .filter((record) => difficulty === 'all' || record.difficulty === difficulty)
        .filter((record) => matchesQuery(query, record.title, record.topics, record.notes))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [records, status, difficulty, query]
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="LeetCode"
        description="Track every problem you attempt, not just the ones you finish."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> Add problem
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Solved" value={stats.solved} hint={`${stats.total} tracked in total`} icon={ListChecks} />
        {stats.byDifficulty.map((row) => (
          <StatCard
            key={row.difficulty}
            label={row.difficulty}
            value={row.solved}
            hint={`${row.total} attempted`}
            tone={row.difficulty === 'Easy' ? 'text-emerald-500' : row.difficulty === 'Medium' ? 'text-amber-500' : 'text-rose-500'}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Problems solved" description="Last 14 days" />
          <CardBody>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [`${value} solved`, 'LeetCode']} />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Top topics" description="Where you spend your reps" />
          <CardBody className="space-y-2">
            {stats.topTopics.length === 0 ? (
              <EmptyState icon={ListChecks} title="No topics yet" description="Tag problems to see patterns." />
            ) : (
              stats.topTopics.map((row) => (
                <div key={row.topic} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-200">{row.topic}</span>
                  <span className="tabular-nums text-slate-500 dark:text-slate-400">{row.count}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Problems"
          description={`${visible.length} of ${records.length} shown`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <TextInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search problems…"
                  className="w-44 pl-9"
                  aria-label="Search problems"
                />
              </div>
              <SegmentedControl
                ariaLabel="Filter by status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'solved', label: 'Solved' },
                  { value: 'todo', label: 'To do' },
                  { value: 'review', label: 'Review' },
                ]}
              />
              <Select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'all' | Difficulty)}
                aria-label="Filter by difficulty"
                className="w-auto"
              >
                <option value="all">All levels</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </Select>
            </div>
          }
        />
        <CardBody>
          {visible.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="No problems match"
              description={records.length === 0 ? 'Add the first problem you are working on.' : 'Try changing the filters.'}
            />
          ) : (
            <ul className="space-y-2">
              {visible.map((record) => (
                <li key={record.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                  <button
                    type="button"
                    aria-label={record.status === 'solved' ? `Mark ${record.title} as to do` : `Mark ${record.title} as solved`}
                    onClick={() => updateLeetCode(record.id, { status: record.status === 'solved' ? 'todo' : 'solved' })}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] transition ${
                      record.status === 'solved'
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 hover:border-brand-500 dark:border-slate-600'
                    }`}
                  >
                    {record.status === 'solved' ? '✓' : ''}
                  </button>

                  <div className="min-w-[160px] flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{record.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone={DIFFICULTY_TONE[record.difficulty]}>{record.difficulty}</Badge>
                      <Badge tone={record.status === 'solved' ? 'green' : record.status === 'review' ? 'amber' : 'slate'}>
                        {STATUS_LABEL[record.status]}
                      </Badge>
                      {record.topics.map((topic) => (
                        <Badge key={topic} tone="sky">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                    {record.notes ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{record.notes}</p>
                    ) : null}
                  </div>

                  <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(record.date)}</span>

                  {record.url ? (
                    <a
                      href={record.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${record.title}`}
                      onClick={() => {
                        setEditing(record)
                        setDialogOpen(true)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${record.title}`} onClick={() => setPendingDelete(record)}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <LeetCodeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} record={editing} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete problem"
        message={`"${pendingDelete?.title ?? ''}" will be removed from your log.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeLeetCode(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
