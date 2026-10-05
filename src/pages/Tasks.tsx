import { CheckCircle2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TaskDialog } from '@/components/tasks/TaskDialog'
import { Badge, PRIORITY_TONE } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select, TextInput } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { relativeDay, todayKey } from '@/lib/date'
import { matchesQuery } from '@/lib/search'
import { useStore } from '@/store/useStore'
import type { Priority, Task } from '@/types'

type Filter = 'all' | 'open' | 'today' | 'completed'
type SortKey = 'due' | 'priority' | 'created' | 'title'

const PRIORITY_WEIGHT: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

export default function Tasks() {
  const tasks = useStore((state) => state.tasks)
  const goals = useStore((state) => state.goals)
  const projects = useStore((state) => state.projects)
  const toggleTask = useStore((state) => state.toggleTask)
  const removeTask = useStore((state) => state.removeTask)
  const clearCompletedTasks = useStore((state) => state.clearCompletedTasks)

  const [filter, setFilter] = useState<Filter>('open')
  const [sort, setSort] = useState<SortKey>('due')
  const [priority, setPriority] = useState<'all' | Priority>('all')
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null)

  const today = todayKey()

  const visible = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (filter === 'open' && task.completed) return false
      if (filter === 'completed' && !task.completed) return false
      if (filter === 'today' && (task.completed || task.dueDate !== today)) return false
      if (priority !== 'all' && task.priority !== priority) return false
      return matchesQuery(query, task.title, task.description, task.tags, task.priority)
    })

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      if (sort === 'priority') return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
      if (sort === 'title') return a.title.localeCompare(b.title)
      if (sort === 'created') return b.createdAt.localeCompare(a.createdAt)
      return (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31')
    })
    return sorted
  }, [tasks, filter, priority, query, sort, today])

  const counts = {
    all: tasks.length,
    open: tasks.filter((task) => !task.completed).length,
    today: tasks.filter((task) => !task.completed && task.dueDate === today).length,
    completed: tasks.filter((task) => task.completed).length,
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tasks"
        description="Everything you have committed to, in one list."
        actions={
          <>
            {counts.completed > 0 ? (
              <Button variant="outline" onClick={clearCompletedTasks}>
                Clear completed
              </Button>
            ) : null}
            <Button
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> New task
            </Button>
          </>
        }
      />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            ariaLabel="Filter tasks"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'open', label: 'Open', count: counts.open },
              { value: 'today', label: 'Due today', count: counts.today },
              { value: 'completed', label: 'Completed', count: counts.completed },
              { value: 'all', label: 'All', count: counts.all },
            ]}
          />
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tasks…"
              className="pl-9"
              aria-label="Search tasks"
            />
          </div>
          <Select
            value={priority}
            onChange={(event) => setPriority(event.target.value as 'all' | Priority)}
            aria-label="Filter by priority"
            className="w-auto"
          >
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            aria-label="Sort tasks"
            className="w-auto"
          >
            <option value="due">Sort: due date</option>
            <option value="priority">Sort: priority</option>
            <option value="created">Sort: newest</option>
            <option value="title">Sort: title</option>
          </Select>
        </div>
      </Card>

      {visible.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={query || priority !== 'all' ? 'No tasks match those filters' : 'No tasks here yet'}
          description={
            filter === 'completed'
              ? 'Complete a task and it will show up here.'
              : 'Create a task to start tracking your work.'
          }
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> New task
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((task) => {
            const goalTitles = task.goalIds
              .map((id) => goals.find((goal) => goal.id === id)?.title)
              .filter(Boolean) as string[]
            const project = projects.find((item) => item.id === task.projectId)
            const overdue = !task.completed && task.dueDate && task.dueDate < today
            return (
              <li key={task.id} className="card animate-fade-in p-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    aria-label={task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`}
                    onClick={() => toggleTask(task.id)}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      task.completed
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 hover:border-brand-500 dark:border-slate-600'
                    }`}
                  >
                    {task.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        task.completed
                          ? 'text-slate-500 line-through dark:text-slate-400'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.description ? (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {task.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
                      {task.dueDate ? (
                        <Badge tone={overdue ? 'rose' : 'slate'}>
                          {overdue ? 'Overdue · ' : ''}
                          {relativeDay(task.dueDate)}
                        </Badge>
                      ) : null}
                      {project ? <Badge tone="violet">{project.name}</Badge> : null}
                      {task.tags.map((tag) => (
                        <Badge key={tag} tone="sky">
                          #{tag}
                        </Badge>
                      ))}
                      {goalTitles.map((title) => (
                        <Badge key={title} tone="green">
                          {title}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${task.title}`}
                      onClick={() => {
                        setEditing(task)
                        setDialogOpen(true)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${task.title}`}
                      onClick={() => setPendingDelete(task)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <TaskDialog open={dialogOpen} onClose={() => setDialogOpen(false)} task={editing} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete task"
        message={`"${pendingDelete?.title ?? ''}" will be permanently removed.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeTask(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
