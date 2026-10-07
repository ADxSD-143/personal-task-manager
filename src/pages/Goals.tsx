import { CalendarClock, CheckCircle2, Link2, Pencil, Plus, Search, Target, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Checkbox, Field, TextArea, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatCard } from '@/components/ui/StatCard'
import { goalProgress } from '@/lib/analytics'
import { formatDate } from '@/lib/date'
import { matchesQuery } from '@/lib/search'
import { useStore } from '@/store/useStore'
import type { Goal } from '@/types'

function GoalDialog({ open, onClose, goal }: { open: boolean; onClose: () => void; goal?: Goal | null }) {
  const addGoal = useStore((state) => state.addGoal)
  const updateGoal = useStore((state) => state.updateGoal)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')
  const [targetDate, setTargetDate] = useState('')
  const [error, setError] = useState('')
  const [key, setKey] = useState<string | null>(null)

  const currentKey = `${goal?.id ?? 'new'}-${open}`
  if (key !== currentKey) {
    setKey(currentKey)
    setTitle(goal?.title ?? '')
    setDescription(goal?.description ?? '')
    setCategory(goal?.category ?? 'General')
    setTargetDate(goal?.targetDate ?? '')
    setError('')
  }

  const submit = () => {
    if (!title.trim()) {
      setError('A title is required.')
      return
    }
    const payload = {
      title: title.trim(),
      description: description.trim(),
      category: category.trim() || 'General',
      targetDate: targetDate || null,
    }
    if (goal) updateGoal(goal.id, payload)
    else addGoal(payload)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? 'Edit goal' : 'New goal'}
      description="Link tasks to a goal so progress is measured automatically."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{goal ? 'Save changes' : 'Create goal'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" error={error}>
          <TextInput value={title} autoFocus onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Solve 150 LeetCode problems" />
        </Field>
        <Field label="Description">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does success look like?" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <TextInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Learning, Career…" />
          </Field>
          <Field label="Target date">
            <TextInput type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  )
}

function LinkTasksDialog({ open, onClose, goal }: { open: boolean; onClose: () => void; goal: Goal | null }) {
  const tasks = useStore((state) => state.tasks)
  const updateTask = useStore((state) => state.updateTask)
  const [query, setQuery] = useState('')

  const visible = tasks.filter((task) => matchesQuery(query, task.title, task.tags))

  const toggle = (taskId: string, linked: boolean) => {
    const task = tasks.find((item) => item.id === taskId)
    if (!task || !goal) return
    updateTask(taskId, {
      goalIds: linked ? task.goalIds.filter((id) => id !== goal.id) : [...task.goalIds, goal.id],
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Link tasks to "${goal?.title ?? ''}"`}
      description="Any task you tick counts towards this goal's progress."
      footer={
        <Button onClick={onClose}>Done</Button>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks…"
            className="pl-9"
            aria-label="Search tasks to link"
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={Target} title="No tasks found" description="Create tasks first, then link them here." />
        ) : (
          <ul className="space-y-1">
            {visible.map((task) => {
              const linked = Boolean(goal && task.goalIds.includes(goal.id))
              return (
                <li key={task.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
                    <Checkbox checked={linked} onChange={() => toggle(task.id, linked)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-800 dark:text-slate-100">{task.title}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {task.completed ? 'Completed' : task.priority} · {task.dueDate ?? 'no due date'}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}

export default function Goals() {
  const goals = useStore((state) => state.goals)
  const tasks = useStore((state) => state.tasks)
  const toggleTask = useStore((state) => state.toggleTask)
  const removeGoal = useStore((state) => state.removeGoal)
  const toggleGoalStatus = useStore((state) => state.toggleGoalStatus)
  const addGoalMilestone = useStore((state) => state.addGoalMilestone)
  const toggleGoalMilestone = useStore((state) => state.toggleGoalMilestone)
  const removeGoalMilestone = useStore((state) => state.removeGoalMilestone)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Goal | null>(null)
  const [linking, setLinking] = useState<Goal | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all')
  const [query, setQuery] = useState('')
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, string>>({})

  const withProgress = goals.map((goal) => ({ goal, progress: goalProgress(goal, tasks) }))
  const activeCount = goals.filter((goal) => goal.status === 'active').length
  const doneCount = goals.filter((goal) => goal.status === 'done').length
  const linkedTasks = tasks.filter((task) => task.goalIds.length > 0).length
  const avgProgress =
    withProgress.length === 0
      ? 0
      : Math.round(withProgress.reduce((sum, item) => sum + item.progress.percent, 0) / withProgress.length)

  const visible = useMemo(
    () =>
      withProgress.filter(({ goal }) => {
        if (filter !== 'all' && goal.status !== filter) return false
        return matchesQuery(query, goal.title, goal.description, goal.category)
      }),
    [goals, tasks, filter, query]
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Goals"
        description="Outcomes you are working towards. Progress comes from the tasks you link."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> New goal
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active goals" value={activeCount} hint={`${goals.length} total`} icon={Target} />
        <StatCard label="Completed" value={doneCount} hint="Marked done" icon={CheckCircle2} tone="text-emerald-500" />
        <StatCard label="Linked tasks" value={linkedTasks} hint={`${tasks.length} tasks in total`} icon={Link2} tone="text-sky-500" />
        <StatCard label="Average progress" value={`${avgProgress}%`} hint="Across all goals" icon={Target} tone="text-violet-500" />
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            ariaLabel="Filter goals"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: goals.length },
              { value: 'active', label: 'Active', count: activeCount },
              { value: 'done', label: 'Done', count: doneCount },
            ]}
          />
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search goals…"
              className="pl-9"
              aria-label="Search goals"
            />
          </div>
        </div>
      </Card>

      {visible.length === 0 ? (
        <EmptyState
          icon={Target}
          title={goals.length === 0 ? 'No goals yet' : 'No goals match'}
          description={goals.length === 0 ? 'Set a goal and link tasks to it to track real progress.' : 'Try a different filter.'}
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> New goal
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map(({ goal, progress }) => {
            const linked = tasks.filter((task) => task.goalIds.includes(goal.id))
            return (
              <Card key={goal.id}>
                <CardHeader
                  title={goal.title}
                  description={goal.description || 'No description'}
                  action={
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${goal.title}`}
                        onClick={() => {
                          setEditing(goal)
                          setDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Delete ${goal.title}`} onClick={() => setPendingDelete(goal)}>
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </div>
                  }
                />
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={goal.status === 'done' ? 'green' : 'brand'}>
                      {goal.status === 'done' ? 'Done' : 'Active'}
                    </Badge>
                    <Badge tone="violet">{goal.category}</Badge>
                    <Badge tone="slate">
                      <CalendarClock className="h-3 w-3" />
                      {goal.targetDate ? formatDate(goal.targetDate) : 'No target date'}
                    </Badge>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {progress.total === 0
                          ? 'No linked tasks yet'
                          : `${progress.completed}/${progress.total} linked tasks complete`}
                      </span>
                      <span className="tabular-nums">{progress.percent}%</span>
                    </div>
                    <ProgressBar
                      value={progress.percent}
                      className="mt-1.5"
                      color={goal.status === 'done' ? '#10b981' : '#6366f1'}
                      label={`${goal.title} progress`}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Milestones</p>
                    {(goal.milestones ?? []).map((milestone) => (
                      <div key={milestone.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={milestone.completed}
                          onChange={() => toggleGoalMilestone(goal.id, milestone.id)}
                          aria-label={`${milestone.completed ? 'Reopen' : 'Complete'} milestone ${milestone.title}`}
                        />
                        <span className={`min-w-0 flex-1 text-xs ${milestone.completed ? 'text-slate-500 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                          {milestone.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete milestone ${milestone.title}`}
                          onClick={() => removeGoalMilestone(goal.id, milestone.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <TextInput
                        value={milestoneDrafts[goal.id] ?? ''}
                        onChange={(event) => setMilestoneDrafts((drafts) => ({ ...drafts, [goal.id]: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            const title = milestoneDrafts[goal.id]?.trim()
                            if (title) addGoalMilestone(goal.id, title)
                            setMilestoneDrafts((drafts) => ({ ...drafts, [goal.id]: '' }))
                          }
                        }}
                        placeholder="Add a milestone"
                        aria-label={`New milestone for ${goal.title}`}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Add milestone to ${goal.title}`}
                        disabled={!milestoneDrafts[goal.id]?.trim()}
                        onClick={() => {
                          const title = milestoneDrafts[goal.id]?.trim()
                          if (title) addGoalMilestone(goal.id, title)
                          setMilestoneDrafts((drafts) => ({ ...drafts, [goal.id]: '' }))
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {linked.length > 0 ? (
                    <ul className="space-y-1">
                      {linked.slice(0, 4).map((task) => (
                        <li key={task.id} className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`}
                            onClick={() => toggleTask(task.id)}
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 text-[9px] transition ${
                              task.completed
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-slate-300 hover:border-brand-500 dark:border-slate-600'
                            }`}
                          >
                            {task.completed ? '✓' : ''}
                          </button>
                          <span
                            className={`truncate text-xs ${
                              task.completed ? 'text-slate-500 line-through dark:text-slate-400' : 'text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {task.title}
                          </span>
                        </li>
                      ))}
                      {linked.length > 4 ? (
                        <li className="text-[11px] text-slate-500 dark:text-slate-400">+{linked.length - 4} more</li>
                      ) : null}
                    </ul>
                  ) : null}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => setLinking(goal)}>
                      <Link2 className="h-3.5 w-3.5" /> Link tasks
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleGoalStatus(goal.id)}>
                      {goal.status === 'done' ? 'Reopen' : 'Mark done'}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <GoalDialog open={dialogOpen} onClose={() => setDialogOpen(false)} goal={editing} />
      <LinkTasksDialog open={Boolean(linking)} onClose={() => setLinking(null)} goal={linking} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete goal"
        message={`"${pendingDelete?.title ?? ''}" will be deleted and unlinked from all tasks.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeGoal(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
