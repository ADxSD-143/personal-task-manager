import { GitCommitVertical, Github, Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
import { StatCard } from '@/components/ui/StatCard'
import { githubStats, githubTrend } from '@/lib/analytics'
import { formatDate, todayKey } from '@/lib/date'
import { matchesQuery } from '@/lib/search'
import { useStore } from '@/store/useStore'
import type { GitHubContribution } from '@/types'

function ContributionDialog({
  open,
  onClose,
  record,
  repos,
}: {
  open: boolean
  onClose: () => void
  record?: GitHubContribution | null
  repos: string[]
}) {
  const addGithub = useStore((state) => state.addGithub)
  const updateGithub = useStore((state) => state.updateGithub)
  const [repo, setRepo] = useState('')
  const [date, setDate] = useState(todayKey())
  const [commits, setCommits] = useState('1')
  const [prs, setPrs] = useState('0')
  const [issues, setIssues] = useState('0')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [key, setKey] = useState<string | null>(null)

  const currentKey = `${record?.id ?? 'new'}-${open}`
  if (key !== currentKey) {
    setKey(currentKey)
    setRepo(record?.repo ?? '')
    setDate(record?.date ?? todayKey())
    setCommits(String(record?.commits ?? 1))
    setPrs(String(record?.prs ?? 0))
    setIssues(String(record?.issues ?? 0))
    setNotes(record?.notes ?? '')
    setError('')
  }

  const submit = () => {
    if (!repo.trim()) {
      setError('A repository name is required.')
      return
    }
    const payload = {
      repo: repo.trim(),
      date,
      commits: Math.max(0, Number(commits) || 0),
      prs: Math.max(0, Number(prs) || 0),
      issues: Math.max(0, Number(issues) || 0),
      notes: notes.trim(),
    }
    if (record) updateGithub(record.id, payload)
    else addGithub(payload)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={record ? 'Edit contribution' : 'Log contribution'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{record ? 'Save changes' : 'Log contribution'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Repository" error={error}>
          <TextInput value={repo} autoFocus list="github-repos" onChange={(e) => setRepo(e.target.value)} placeholder="owner/repo" />
          <datalist id="github-repos">
            {repos.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </Field>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Date">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Commits">
            <TextInput type="number" min={0} value={commits} onChange={(e) => setCommits(e.target.value)} />
          </Field>
          <Field label="Pull requests">
            <TextInput type="number" min={0} value={prs} onChange={(e) => setPrs(e.target.value)} />
          </Field>
          <Field label="Issues">
            <TextInput type="number" min={0} value={issues} onChange={(e) => setIssues(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you ship?" />
        </Field>
      </div>
    </Modal>
  )
}

export default function GitHub() {
  const records = useStore((state) => state.github)
  const removeGithub = useStore((state) => state.removeGithub)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<GitHubContribution | null>(null)
  const [pendingDelete, setPendingDelete] = useState<GitHubContribution | null>(null)
  const [repoFilter, setRepoFilter] = useState('all')
  const [query, setQuery] = useState('')

  const stats = githubStats(records)
  const trend = githubTrend(records, 30)
  const repos = Array.from(new Set(records.map((record) => record.repo))).sort()

  const repoSummary = useMemo(
    () =>
      repos
        .map((repo) => ({
          repo,
          commits: records.filter((r) => r.repo === repo).reduce((sum, r) => sum + r.commits, 0),
          entries: records.filter((r) => r.repo === repo).length,
        }))
        .sort((a, b) => b.commits - a.commits),
    [records, repos]
  )

  const visible = useMemo(
    () =>
      records
        .filter((record) => repoFilter === 'all' || record.repo === repoFilter)
        .filter((record) => matchesQuery(query, record.repo, record.notes, record.date))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [records, repoFilter, query]
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="GitHub contributions"
        description="A manual log of what you shipped, kept next to everything else you are doing."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> Log contribution
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Commits" value={stats.commits} hint={`${stats.windowCommits} in the last 30 days`} icon={GitCommitVertical} />
        <StatCard label="Pull requests" value={stats.prs} hint="Opened" icon={Github} tone="text-violet-500" />
        <StatCard label="Issues" value={stats.issues} hint="Opened or closed" icon={Github} tone="text-amber-500" />
        <StatCard label="Commit streak" value={`${stats.streak}d`} hint={`${stats.activeDays} active days (30d)`} icon={GitCommitVertical} tone="text-emerald-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Commits" description="Last 30 days" />
          <CardBody>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval={4} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [`${value} commits`, 'GitHub']} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Repositories" description="Commits per repo" />
          <CardBody className="space-y-2">
            {repoSummary.length === 0 ? (
              <EmptyState icon={Github} title="No repositories yet" description="Log a contribution to get started." />
            ) : (
              repoSummary.map((row) => (
                <div key={row.repo} className="flex items-center justify-between text-xs">
                  <span className="truncate text-slate-700 dark:text-slate-200">{row.repo}</span>
                  <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
                    {row.commits} commits · {row.entries} logs
                  </span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Activity log"
          description={`${visible.length} of ${records.length} shown`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <TextInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search repos…"
                  className="w-44 pl-9"
                  aria-label="Search contributions"
                />
              </div>
              <Select value={repoFilter} onChange={(e) => setRepoFilter(e.target.value)} aria-label="Filter by repository" className="w-auto">
                <option value="all">All repositories</option>
                {repos.map((repo) => (
                  <option key={repo} value={repo}>
                    {repo}
                  </option>
                ))}
              </Select>
            </div>
          }
        />
        <CardBody>
          {visible.length === 0 ? (
            <EmptyState
              icon={Github}
              title="No contributions match"
              description={records.length === 0 ? 'Log your first contribution.' : 'Try different filters.'}
            />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {visible.map((record) => (
                <li key={record.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-[160px] flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{record.repo}</p>
                    {record.notes ? <p className="text-xs text-slate-500 dark:text-slate-400">{record.notes}</p> : null}
                  </div>
                  <Badge tone="violet">{record.commits} commits</Badge>
                  {record.prs > 0 ? <Badge tone="sky">{record.prs} PR</Badge> : null}
                  {record.issues > 0 ? <Badge tone="amber">{record.issues} issues</Badge> : null}
                  <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(record.date)}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${record.repo} on ${record.date}`}
                      onClick={() => {
                        setEditing(record)
                        setDialogOpen(true)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${record.repo} on ${record.date}`} onClick={() => setPendingDelete(record)}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <ContributionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} record={editing} repos={repos} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete contribution"
        message={`The entry for "${pendingDelete?.repo ?? ''}" on ${pendingDelete?.date ?? ''} will be removed.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeGithub(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
