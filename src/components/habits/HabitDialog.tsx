import { Button } from '@/components/ui/Button'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import type { Habit } from '@/types'
import { useStore } from '@/store/useStore'
import { useState } from 'react'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#ec4899']

export function HabitDialog({
  open,
  onClose,
  habit,
}: {
  open: boolean
  onClose: () => void
  habit?: Habit | null
}) {
  const addHabit = useStore((state) => state.addHabit)
  const updateHabit = useStore((state) => state.updateHabit)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily')
  const [target, setTarget] = useState(5)
  const [error, setError] = useState('')
  const [seededFor, setSeededFor] = useState<string | null>(null)

  const currentKey = `${habit?.id ?? 'new'}-${open}`
  if (open && seededFor !== currentKey) {
    setSeededFor(currentKey)
    setName(habit?.name ?? '')
    setDescription(habit?.description ?? '')
    setColor(habit?.color ?? COLORS[0])
    setFrequency(habit?.frequency ?? 'daily')
    setTarget(habit?.targetPerPeriod ?? 5)
    setError('')
  }

  const submit = () => {
    if (!name.trim()) {
      setError('A name is required.')
      return
    }
    const payload = {
      name: name.trim(),
      description: description.trim(),
      color,
      frequency,
      targetPerPeriod: frequency === 'daily' ? 1 : Math.min(7, Math.max(1, target)),
    }
    if (habit) updateHabit(habit.id, payload)
    else addHabit(payload)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={habit ? 'Edit habit' : 'New habit'}
      description="Small, repeatable actions compound."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{habit ? 'Save changes' : 'Create habit'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" error={error}>
          <TextInput
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Deep work"
          />
        </Field>

        <Field label="Description">
          <TextArea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Why does this habit matter?"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Frequency">
            <Select
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as 'daily' | 'weekly')}
            >
              <option value="daily">Every day</option>
              <option value="weekly">Times per week</option>
            </Select>
          </Field>
          {frequency === 'weekly' ? (
            <Field label="Days per week" hint="Target days per week (1-7)">
              <TextInput
                type="number"
                min={1}
                max={7}
                value={target}
                onChange={(event) => setTarget(Number(event.target.value))}
              />
            </Field>
          ) : null}
        </div>

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
