import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildSeedData } from '@/lib/seed'
import { useStore } from '@/store/useStore'
import type { DataState } from '@/types'

const mocks = vi.hoisted(() => ({
  row: null as { data: DataState; updated_at: string } | null,
  changes: null as ((payload: { new: Record<string, unknown> }) => void) | null,
  signOut: vi.fn(async () => ({ error: null })),
  upsert: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: 'user-1', email: 'test@example.com' } } },
        error: null,
      })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: mocks.signOut,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: mocks.row, error: null })),
        })),
      })),
    })),
    rpc: vi.fn(async (_name: string, args: { p_data: DataState; p_expected_updated_at: string | null }) => {
      if (mocks.row && args.p_expected_updated_at !== mocks.row.updated_at) {
        return { data: [{ saved: false, data: mocks.row.data, updated_at: mocks.row.updated_at }], error: null }
      }
      const updatedAt = new Date().toISOString()
      mocks.row = { data: args.p_data, updated_at: updatedAt }
      mocks.upsert(args.p_data)
      return { data: [{ saved: true, data: args.p_data, updated_at: updatedAt }], error: null }
    }),
    channel: vi.fn(() => {
      const channel = {
        on: vi.fn((_event: string, _filter: unknown, callback: typeof mocks.changes) => {
          mocks.changes = callback
          return channel
        }),
        subscribe: vi.fn(() => channel),
      }
      return channel
    }),
    removeChannel: vi.fn(async () => 'ok'),
  },
}))

import { CloudSyncProvider } from '@/components/auth/CloudSyncProvider'

function SyncProbe() {
  const tasks = useStore((state) => state.tasks)
  const courses = useStore((state) => state.courses)
  const addTask = useStore((state) => state.addTask)
  return (
    <main>
      <div data-testid="task-list">{tasks.map((task) => task.title).join(', ')}</div>
      <div data-testid="course-progress">{courses.flatMap((course) => course.days.flatMap((day) => day.videos)).filter((video) => video.completed).length}</div>
      <button type="button" onClick={() => addTask({ title: 'Phone task' })}>Add task</button>
    </main>
  )
}

const mount = () => render(<CloudSyncProvider><SyncProbe /></CloudSyncProvider>)

describe('cloud data synchronization', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useStore.getState().clearAll()
    mocks.row = null
    mocks.changes = null
    mocks.signOut.mockClear()
    mocks.upsert.mockClear()
  })

  it('asks before migrating saved local data into an empty account', async () => {
    const user = userEvent.setup()
    useStore.getState().addTask({ title: 'Saved locally' })
    mount()

    expect(await screen.findByRole('heading', { name: 'Local data found' })).toBeInTheDocument()
    expect(mocks.upsert).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Upload & Sync' }))
    await waitFor(() => expect(mocks.row?.data.tasks[0].title).toBe('Saved locally'))
    expect(await screen.findByTestId('task-list')).toHaveTextContent('Saved locally')
  })

  it('loads cloud data and receives course progress changes from another device', async () => {
    const cloudData = buildSeedData()
    cloudData.tasks = [{ ...cloudData.tasks[0], title: 'Cloud task' }]
    const day = cloudData.courses[0].days[23]
    while (day.videos.length < 9) {
      day.videos.push({
        id: `video-${day.videos.length}`,
        title: `Video ${day.videos.length + 1}`,
        url: '',
        duration: 10,
        completed: false,
        completedAt: null,
      })
    }
    day.videos[8].completed = true
    mocks.row = { data: cloudData, updated_at: '2026-10-06T01:00:00.000Z' }
    mount()

    await waitFor(() => expect(useStore.getState().tasks[0]?.title).toBe('Cloud task'))
    await waitFor(() => expect(screen.getByTestId('task-list')).toHaveTextContent('Cloud task'))
    expect(screen.getByTestId('course-progress')).toHaveTextContent('1')

    const updated = { ...cloudData, tasks: [{ ...cloudData.tasks[0], title: 'Updated on tablet' }] }
    act(() => mocks.changes?.({ new: { data: updated, updated_at: '2026-10-06T02:00:00.000Z' } }))
    await waitFor(() => expect(screen.getByTestId('task-list')).toHaveTextContent('Updated on tablet'))
  })

  it('saves local edits with all app collections in a cloud snapshot', async () => {
    const user = userEvent.setup()
    const cloudData = buildSeedData()
    cloudData.workouts = [{
      id: 'workout-1',
      title: 'Run',
      date: '2026-10-06',
      notes: '',
      completed: false,
      exercises: [{ id: 'exercise-1', name: 'Intervals', sets: 1, reps: 1, weightKg: null, durationMinutes: 20, notes: '' }],
      createdAt: new Date().toISOString(),
    }]
    cloudData.notes = [{
      id: 'note-1',
      title: 'Study notes',
      content: 'Review graphs',
      tags: ['study'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]
    mocks.row = { data: cloudData, updated_at: '2026-10-06T01:00:00.000Z' }
    mount()

    await waitFor(() => expect(useStore.getState().tasks[0]?.title).toBe('Review ML Day 1 notes'))
    await user.click(screen.getByRole('button', { name: 'Add task' }))
    await waitFor(() => expect(mocks.upsert).toHaveBeenCalled(), { timeout: 2500 })
    const snapshot = mocks.upsert.mock.calls[0][0] as DataState
    expect(snapshot.tasks.some((task) => task.title === 'Phone task')).toBe(true)
    expect(snapshot.workouts[0].exercises[0].name).toBe('Intervals')
    expect(snapshot.notes[0].content).toBe('Review graphs')
  })

  it('does not replace existing cloud data with a stale local snapshot', async () => {
    const user = userEvent.setup()
    const localTask = {
      id: 'shared-task',
      title: 'Stale local edit',
      description: '',
      completed: false,
      priority: 'medium' as const,
      tags: [],
      dueDate: null,
      goalIds: [],
      projectId: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    }
    const localOnlyTask = { ...localTask, id: 'local-only', title: 'Local only' }
    useStore.setState({ tasks: [localTask, localOnlyTask] })
    const cloudData = buildSeedData()
    cloudData.tasks = [{ ...localTask, title: 'Cloud edit' }]
    mocks.row = { data: cloudData, updated_at: '2026-10-06T03:00:00.000Z' }
    mount()

    expect(await screen.findByRole('heading', { name: 'Local and cloud data differ' })).toBeInTheDocument()
    expect(mocks.upsert).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Merge local data' }))

    await waitFor(() => expect(mocks.row?.data.tasks.map((task) => task.title)).toEqual(['Cloud edit', 'Local only']))
    expect(await screen.findByTestId('task-list')).toHaveTextContent('Cloud edit, Local only')
  })
})
