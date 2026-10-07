import { Activity, Check, Dumbbell, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, TextArea, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { todayKey } from '@/lib/date'
import { useStore } from '@/store/useStore'
import type { Workout } from '@/types'

function WorkoutDialog({
  open,
  workout,
  onClose,
}: {
  open: boolean
  workout: Workout | null
  onClose: () => void
}) {
  const addWorkout = useStore((state) => state.addWorkout)
  const updateWorkout = useStore((state) => state.updateWorkout)
  const [key, setKey] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayKey())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const formKey = `${workout?.id ?? 'new'}-${open}`
  if (key !== formKey) {
    setKey(formKey)
    setTitle(workout?.title ?? '')
    setDate(workout?.date ?? todayKey())
    setNotes(workout?.notes ?? '')
    setError('')
  }

  const submit = () => {
    if (!title.trim()) {
      setError('A workout name is required.')
      return
    }
    const fields = { title: title.trim(), date, notes: notes.trim() }
    if (workout) updateWorkout(workout.id, fields)
    else addWorkout(fields)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={workout ? 'Edit workout' : 'Log a workout'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>{workout ? 'Save changes' : 'Add workout'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Workout" error={error}>
          <TextInput value={title} autoFocus onChange={(event) => setTitle(event.target.value)} placeholder="Strength day, yoga…" />
        </Field>
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label="Notes">
          <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="How did it go?" />
        </Field>
      </div>
    </Modal>
  )
}

function ExerciseDialog({ workout, onClose }: { workout: Workout | null; onClose: () => void }) {
  const addExercise = useStore((state) => state.addWorkoutExercise)
  const [name, setName] = useState('')
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('10')
  const [weight, setWeight] = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    if (!workout || !name.trim()) {
      setError('An exercise name is required.')
      return
    }
    const setCount = Number(sets)
    const repCount = Number(reps)
    const weightKg = weight ? Number(weight) : null
    const durationMinutes = duration ? Number(duration) : null
    if (
      !Number.isInteger(setCount) || setCount < 0 ||
      !Number.isInteger(repCount) || repCount < 0 ||
      (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0)) ||
      (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes < 0))
    ) {
      setError('Sets, reps, weight and minutes must be non-negative numbers.')
      return
    }
    addExercise(workout.id, {
      name: name.trim(),
      sets: setCount,
      reps: repCount,
      weightKg,
      durationMinutes,
      notes: notes.trim(),
    })
    onClose()
  }

  return (
    <Modal
      open={Boolean(workout)}
      onClose={onClose}
      title="Add exercise"
      description={workout?.title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Add exercise</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Exercise" error={error}>
          <TextInput value={name} autoFocus onChange={(event) => setName(event.target.value)} placeholder="Squat, running…" />
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Sets">
            <TextInput type="number" min="0" value={sets} onChange={(event) => setSets(event.target.value)} />
          </Field>
          <Field label="Reps">
            <TextInput type="number" min="0" value={reps} onChange={(event) => setReps(event.target.value)} />
          </Field>
          <Field label="Weight (kg)">
            <TextInput type="number" min="0" step="0.5" value={weight} onChange={(event) => setWeight(event.target.value)} />
          </Field>
          <Field label="Minutes">
            <TextInput type="number" min="0" value={duration} onChange={(event) => setDuration(event.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

export default function Fitness() {
  const workouts = useStore((state) => state.workouts)
  const updateWorkout = useStore((state) => state.updateWorkout)
  const removeWorkout = useStore((state) => state.removeWorkout)
  const removeExercise = useStore((state) => state.removeWorkoutExercise)
  const [editing, setEditing] = useState<Workout | null>(null)
  const [addingFor, setAddingFor] = useState<Workout | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Workout | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(true)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fitness"
        description="Log workouts and track exercises across your devices."
        actions={
          <Button onClick={() => {
            setCreating(true)
            setEditing(null)
            setDialogOpen(true)
          }}>
            <Plus className="h-4 w-4" /> Log workout
          </Button>
        }
      />
      {workouts.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState icon={Activity} title="No workouts yet" description="Log a workout and add its exercises to start tracking fitness." />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {[...workouts].sort((a, b) => b.date.localeCompare(a.date)).map((workout) => (
            <Card key={workout.id}>
              <CardHeader
                title={workout.title}
                description={`${workout.date} · ${workout.exercises.length} exercises`}
                action={
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${workout.title}`} onClick={() => {
                      setCreating(false)
                      setEditing(workout)
                      setDialogOpen(true)
                    }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${workout.title}`} onClick={() => setPendingDelete(workout)}>
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                }
              />
              <CardBody className="space-y-3">
                {workout.notes ? <p className="text-sm text-slate-600 dark:text-slate-400">{workout.notes}</p> : null}
                <div className="space-y-2">
                  {workout.exercises.map((exercise) => (
                    <div key={exercise.id} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                      <Dumbbell className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{exercise.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {exercise.sets ? `${exercise.sets} × ${exercise.reps}` : ''}
                          {exercise.weightKg !== null ? ` · ${exercise.weightKg} kg` : ''}
                          {exercise.durationMinutes !== null ? ` · ${exercise.durationMinutes} min` : ''}
                        </p>
                        {exercise.notes ? <p className="mt-1 text-xs text-slate-500">{exercise.notes}</p> : null}
                      </div>
                      <Button variant="ghost" size="icon" aria-label={`Remove ${exercise.name}`} onClick={() => removeExercise(workout.id, exercise.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAddingFor(workout)}>
                    <Plus className="h-4 w-4" /> Exercise
                  </Button>
                  <Button
                    variant={workout.completed ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => updateWorkout(workout.id, { completed: !workout.completed })}
                  >
                    <Check className="h-4 w-4" /> {workout.completed ? 'Completed' : 'Mark complete'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      <WorkoutDialog open={dialogOpen} workout={creating ? null : editing} onClose={() => setDialogOpen(false)} />
      <ExerciseDialog workout={addingFor} onClose={() => setAddingFor(null)} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete workout"
        message={`Delete "${pendingDelete?.title ?? ''}" and its exercises?`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeWorkout(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
