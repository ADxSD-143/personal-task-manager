import { CheckSquare, Repeat } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import type { Priority, Task } from '@/types'
import { useStore } from '@/store/useStore'
import { todayKey } from '@/lib/date'

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']

export function TaskDialog({
  open,
  onClose,
  task,
}: {
  open: boolean
  onClose: () => void
  task?: Task | null
}) {
  const addTask = useStore((state) => state.addTask)
  const updateTask = useStore((state) => state.updateTask)
  const goals = useStore((state) => state.goals)
  const projects = useStore((state) => state.projects)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [tags, setTags] = useState('')
  const [goalIds, setGoalIds] = useState<string[]>([])
  const [projectId, setProjectId] = useState('')
  const [error, setError] = useState('')
  const [seededFor, setSeededFor] = useState<string | null>(null)

  const currentKey = `${task?.id ?? 'new'}-${open}`
  if (open && seededFor !== currentKey) {
    setSeededFor(currentKey)
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setPriority(task?.priority ?? 'medium')
    setDueDate(task?.dueDate ?? '')
    setTags((task?.tags ?? []).join(', '))
    setGoalIds(task?.goalIds ?? [])
    setProjectId(task?.projectId ?? '')
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
      priority,
      dueDate: dueDate || null,
      tags: tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
      goalIds,
      projectId: projectId || null,
    }
    if (task) updateTask(task.id, payload)
    else addTask(payload)
    onClose()
  }

  const toggleGoal = (id: string) =>
    setGoalIds((current) =>
      current.includes(id) ? current.filter((goalId) => goalId !== id) : [...current, id]
    )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      description="Tasks keep the day honest."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{task ? 'Save changes' : 'Create task'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" error={error}>
          <TextInput
            value={title}
            autoFocus
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs to get done?"
          />
        </Field>

        <Field label="Notes">
          <TextArea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional details, links or acceptance criteria"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Priority">
            <Select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due date">
            <TextInput
              type="date"
              value={dueDate}
              min="2000-01-01"
              onChange={(event) => setDueDate(event.target.value)}
            />
          </Field>
          <Field label="Project">
            <Select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Tags" hint="Comma separated, e.g. ml, dsa, reading">
          <TextInput
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="ml, study"
          />
        </Field>

        <div>
          <p className="label">Linked goals</p>
          {goals.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No goals yet — create one to link tasks to outcomes.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {goals.map((goal) => {
                const active = goalIds.includes(goal.id)
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                        : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {goal.title}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" /> Today is {todayKey()}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Repeat className="h-3.5 w-3.5" /> Recurring tasks can be re-added after completion
          </span>
        </div>
      </div>
    </Modal>
  )
}
