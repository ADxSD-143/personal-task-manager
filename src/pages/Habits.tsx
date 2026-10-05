import { Flame, Pencil, Plus, Repeat, Trash2, Trophy } from 'lucide-react'
import { useState } from 'react'
import { HabitDialog } from '@/components/habits/HabitDialog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { habitStats } from '@/lib/analytics'
import { lastNDays, todayKey } from '@/lib/date'
import { useStore } from '@/store/useStore'
import type { Habit } from '@/types'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function HabitCard({ habit, onEdit, onDelete }: { habit: Habit; onEdit: () => void; onDelete: () => void }) {
  const toggleHabitDate = useStore((state) => state.toggleHabitDate)
  const stats = habitStats(habit)
  const days = lastNDays(14)
  const today = todayKey()

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: habit.color }} />
            <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {habit.name}
            </h3>
          </div>
          {habit.description ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{habit.description}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="brand">
              {habit.frequency === 'daily' ? 'Daily' : `${habit.targetPerPeriod}× per week`}
            </Badge>
            <Badge tone="amber">
              <Flame className="h-3 w-3" /> {stats.streak} streak
            </Badge>
            <Badge tone="slate">
              <Trophy className="h-3 w-3" /> best {stats.longest}
            </Badge>
            <Badge tone="green">{stats.rate}% / 30d</Badge>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" aria-label={`Edit ${habit.name}`} onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${habit.name}`} onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-1.5">
        {days.map((day) => {
          const done = habit.completions.includes(day)
          const isToday = day === today
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleHabitDate(habit.id, day)}
              title={day}
              aria-label={`${done ? 'Unlog' : 'Log'} ${habit.name} for ${day}`}
              aria-pressed={done}
              className={`flex h-9 w-9 flex-col items-center justify-center rounded-lg border text-[10px] font-medium transition ${
                done
                  ? 'border-transparent text-white'
                  : 'border-slate-200 text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400'
              } ${isToday ? 'ring-2 ring-brand-500/40' : ''}`}
              style={done ? { backgroundColor: habit.color } : undefined}
            >
              <span>{DAY_LABELS[new Date(`${day}T00:00:00`).getDay()]}</span>
              <span className="tabular-nums opacity-80">{day.slice(8)}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Logged {stats.last30} of the last 30 days · {stats.total} total
        </p>
        <Button
          size="sm"
          variant={habit.completions.includes(today) ? 'secondary' : 'primary'}
          onClick={() => toggleHabitDate(habit.id, today)}
        >
          {habit.completions.includes(today) ? 'Undo today' : 'Log today'}
        </Button>
      </div>
    </Card>
  )
}

export default function Habits() {
  const habits = useStore((state) => state.habits)
  const removeHabit = useStore((state) => state.removeHabit)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Habit | null>(null)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Habits"
        description="Consistency beats intensity. Log a day to keep the streak alive."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> New habit
          </Button>
        }
      />

      {habits.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No habits yet"
          description="Start with one habit you can do every day."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> New habit
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onEdit={() => {
                setEditing(habit)
                setDialogOpen(true)
              }}
              onDelete={() => setPendingDelete(habit)}
            />
          ))}
        </div>
      )}

      <HabitDialog open={dialogOpen} onClose={() => setDialogOpen(false)} habit={editing} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete habit"
        message={`"${pendingDelete?.name ?? ''}" and its completion history will be permanently removed.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeHabit(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
