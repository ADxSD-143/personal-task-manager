import { ExternalLink, Pencil, Plus, Search, Trash2, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { cpStats } from '@/lib/analytics'
import { formatDate, todayKey } from '@/lib/date'
import { matchesQuery } from '@/lib/search'
import { useStore } from '@/store/useStore'
import type { CPRecord, SolveStatus } from '@/types'

const STATUS_LABEL: Record<SolveStatus, string> = {
  todo: 'To do',
  solved: 'Solved',
  review: 'Review',
}

function CPDialog({
  open,
  onClose,
  record,
}: {
  open: boolean
  onClose: () => void
  record?: CPRecord | null
}) {
  const addCp = useStore((state) => state.addCp)
  const updateCp = useStore((state) => state.updateCp)
  const [platform, setPlatform] = useState('Codeforces')
  const [title, setTitle] = useState('')
  const [rating, setRating] = useState('')
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState<SolveStatus>('todo')
  const [url, setUrl] = useState('')
  const [date, setDate] = useState(todayKey())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [key, setKey] = useState<string | null>(null)

  const currentKey = `${record?.id ?? 'new'}-${open}`
  if (key !== currentKey) {
    setKey(currentKey)
    setPlatform(record?.platform ?? 'Codeforces')
    setTitle(record?.title ?? '')
    setRating(record?.rating ? String(record.rating) : '')
    setTopic(record?.topic ?? '')
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
    const parsedRating = Number(rating)
    const payload = {
      platform: platform.trim() || 'Codeforces',
      title: title.trim(),
      rating: rating && !Number.isNaN(parsedRating) ? Math.round(parsedRating) : null,
      topic: topic.trim(),
      status,
      url: url.trim(),
      date,
      notes: notes.trim(),
    }
    if (record) updateCp(record.id, payload)
    else addCp(payload)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={record ? 'Edit contest problem' : 'Add contest problem'}
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
          <TextInput value={title} autoFocus onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Round 950 Div 3 — Problem C" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Platform">
            <TextInput value={platform} onChange={(e) => setPlatform(e.target.value)} list="cp-platforms" />
            <datalist id="cp-platforms">
              <option value="Codeforces" />
              <option value="CodeChef" />
              <option value="AtCoder" />
              <option value="HackerRank" />
              <option value="LeetCode" />
            </datalist>
          </Field>
          <Field label="Rating">
            <TextInput type="number" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="1200" />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as SolveStatus)}>
              <option value="todo">To do</option>
              <option value="solved">Solved</option>
              <option value="review">Needs review</option>
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Topic">
            <TextInput value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Greedy, DP…" />
          </Field>
          <Field label="Date">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Link">
          <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Notes">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What tripped you up?" />
        </Field>
      </div>
    </Modal>
  )
}

export default function CompetitiveProgramming() {
  const records = useStore((state) => state.cp)
  const updateCp = useStore((state) => state.updateCp)
  const removeCp = useStore((state) => state.removeCp)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CPRecord | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CPRecord | null>(null)
  const [platform, setPlatform] = useState('all')
  const [status, setStatus] = useState<'all' | SolveStatus>('all')
  const [query, setQuery] = useState('')

  const stats = cpStats(records)
  const platforms = ['all', ...stats.byPlatform.map((row) => row.platform)]

  const visible = useMemo(
    () =>
      records
        .filter((record) => platform === 'all' || record.platform === platform)
        .filter((record) => status === 'all' || record.status === status)
        .filter((record) => matchesQuery(query, record.title, record.topic, record.notes, record.platform))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [records, platform, status, query]
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Competitive programming"
        description="Contest problems, ratings and the topics that keep showing up."
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
        <StatCard label="Solved" value={stats.solved} hint={`${stats.total} tracked`} icon={Trophy} />
        <StatCard label="Average rating" value={stats.avgRating || '—'} hint="Solved problems only" icon={Trophy} tone="text-amber-500" />
        <StatCard label="Highest rating" value={stats.maxRating || '—'} hint="Personal best" icon={Trophy} tone="text-rose-500" />
        <StatCard label="Platforms" value={stats.byPlatform.length} hint="Where you compete" icon={Trophy} tone="text-sky-500" />
      </div>

      {stats.byPlatform.length > 0 ? (
        <Card>
          <CardHeader title="By platform" description="Solved out of attempted" />
          <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.byPlatform.map((row) => (
              <div key={row.platform} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{row.platform}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {row.solved} solved · {row.total - row.solved} open
                </p>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

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
                  aria-label="Search contest problems"
                />
              </div>
              <Select value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Filter by platform" className="w-auto">
                {platforms.map((value) => (
                  <option key={value} value={value}>
                    {value === 'all' ? 'All platforms' : value}
                  </option>
                ))}
              </Select>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'all' | SolveStatus)}
                aria-label="Filter by status"
                className="w-auto"
              >
                <option value="all">All statuses</option>
                <option value="todo">To do</option>
                <option value="solved">Solved</option>
                <option value="review">Needs review</option>
              </Select>
            </div>
          }
        />
        <CardBody>
          {visible.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No problems match"
              description={records.length === 0 ? 'Log your first contest problem.' : 'Try different filters.'}
            />
          ) : (
            <ul className="space-y-2">
              {visible.map((record) => (
                <li key={record.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                  <button
                    type="button"
                    aria-label={record.status === 'solved' ? `Mark ${record.title} as to do` : `Mark ${record.title} as solved`}
                    onClick={() => updateCp(record.id, { status: record.status === 'solved' ? 'todo' : 'solved' })}
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
                      <Badge tone="violet">{record.platform}</Badge>
                      {record.rating ? <Badge tone="amber">{record.rating}</Badge> : null}
                      <Badge tone={record.status === 'solved' ? 'green' : record.status === 'review' ? 'amber' : 'slate'}>
                        {STATUS_LABEL[record.status]}
                      </Badge>
                      {record.topic ? <Badge tone="sky">{record.topic}</Badge> : null}
                    </div>
                    {record.notes ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{record.notes}</p> : null}
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

      <CPDialog open={dialogOpen} onClose={() => setDialogOpen(false)} record={editing} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete problem"
        message={`"${pendingDelete?.title ?? ''}" will be removed from your log.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeCp(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
