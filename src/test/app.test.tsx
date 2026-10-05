import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { useStore } from '@/store/useStore'
import { todayKey } from '@/lib/date'
import { courseStats } from '@/lib/analytics'

const store = () => useStore.getState()

const renderAt = async (path: string) => {
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )
  await screen.findByRole('heading', { level: 1 }, { timeout: 10000 })
  return result
}

const mlCourse = () => store().courses.find((course) => course.title === 'Machine Learning')!
const dayByOrder = (order: number) => mlCourse().days.find((day) => day.order === order)!

beforeEach(() => {
  window.localStorage.clear()
  store().resetAll()
})

describe('dashboard', () => {
  it('renders the profile, score and summary cards', async () => {
    await renderAt('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Personal OS/)
    expect(screen.getByText('Tasks completed')).toBeInTheDocument()
    expect(screen.getByText('Course progress')).toBeInTheDocument()
    expect(screen.getByText('Habits today')).toBeInTheDocument()
    expect(screen.getByText('Study this week')).toBeInTheDocument()
  })

  it('lists tasks that are due today or overdue', async () => {
    await renderAt('/')
    expect(screen.getByText('Review ML Day 1 notes')).toBeInTheDocument()
  })
})

describe('tasks flow', () => {
  it('creates, completes and persists a task', async () => {
    const user = userEvent.setup()
    await renderAt('/tasks')

    await user.click(screen.getByRole('button', { name: /New task/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Title'), 'Ship the Personal OS')
    await user.type(within(dialog).getByLabelText('Tags'), 'build, focus')
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Ship the Personal OS')).toBeInTheDocument()

    const created = store().tasks.find((task) => task.title === 'Ship the Personal OS')
    expect(created?.tags).toEqual(['build', 'focus'])

    await user.click(screen.getByRole('button', { name: 'Complete Ship the Personal OS' }))
    const completed = store().tasks.find((task) => task.id === created?.id)
    expect(completed?.completed).toBe(true)
    expect(completed?.completedAt).not.toBeNull()

    expect(window.localStorage.getItem('personal-os-v1')).toContain('Ship the Personal OS')
  })

  it('edits and deletes a task', async () => {
    const user = userEvent.setup()
    await renderAt('/tasks')

    await user.click(screen.getByRole('button', { name: 'Edit Review ML Day 1 notes' }))
    const dialog = screen.getByRole('dialog')
    const titleInput = within(dialog).getByLabelText('Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Review ML notes properly')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(screen.getByText('Review ML notes properly')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete Review ML notes properly' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(store().tasks.find((task) => task.title === 'Review ML notes properly')).toBeUndefined()
  })

  it('filters tasks by search query', async () => {
    const user = userEvent.setup()
    await renderAt('/tasks')

    await user.type(screen.getByLabelText('Search tasks'), 'array problems')
    expect(screen.getByText('Solve two array problems')).toBeInTheDocument()
    expect(screen.queryByText('Review ML Day 1 notes')).not.toBeInTheDocument()
  })
})

describe('habits flow', () => {
  it('creates a habit, logs today and shows the streak', async () => {
    const user = userEvent.setup()
    await renderAt('/habits')

    await user.click(screen.getByRole('button', { name: /New habit/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'Morning run')
    await user.selectOptions(within(dialog).getByLabelText('Frequency'), 'weekly')
    await user.click(within(dialog).getByRole('button', { name: 'Create habit' }))

    expect(screen.getByText('Morning run')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Log today' })[0])
    const habit = store().habits.find((item) => item.name === 'Morning run')
    expect(habit?.completions).toContain(todayKey())
    expect(habit?.frequency).toBe('weekly')

    await user.click(screen.getAllByRole('button', { name: 'Undo today' })[0])
    expect(
      store().habits.find((item) => item.name === 'Morning run')?.completions
    ).not.toContain(todayKey())
  })

  it('logs a specific day from the streak strip', async () => {
    const user = userEvent.setup()
    await renderAt('/habits')

    const habit = store().habits[0]
    await user.click(screen.getByRole('button', { name: `Log ${habit.name} for ${todayKey()}` }))
    expect(store().habits.find((item) => item.id === habit.id)?.completions).toContain(todayKey())
  })
})

describe('learning flow', () => {
  it('opens day 24 and shows its videos', async () => {
    const course = mlCourse()
    const day = dayByOrder(24)
    await renderAt(`/learning/${course.id}/day/${day.id}`)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Day 24 · Neural Networks Fundamentals')
    expect(screen.getByText('The Perceptron')).toBeInTheDocument()
    expect(screen.getByText('Backpropagation by Hand')).toBeInTheDocument()
  })

  it('adds, edits, reorders, completes and deletes videos with recalculation', async () => {
    const user = userEvent.setup()
    const course = mlCourse()
    const day = dayByOrder(24)
    await renderAt(`/learning/${course.id}/day/${day.id}`)

    const before = courseStats(mlCourse()).total
    expect(day.videos).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: /Add video/i }))
    let dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Title'), 'Custom video')
    const durationField = within(dialog).getByLabelText('Duration (minutes)')
    await user.clear(durationField)
    await user.type(durationField, '25')
    await user.click(within(dialog).getByRole('button', { name: 'Add video' }))

    expect(screen.getByText('Custom video')).toBeInTheDocument()
    expect(courseStats(mlCourse()).total).toBe(before + 1)

    const added = mlCourse().days.find((d) => d.id === day.id)!.videos.at(-1)!
    expect(added.duration).toBe(25)

    await user.click(screen.getByRole('button', { name: 'Edit Custom video' }))
    dialog = screen.getByRole('dialog')
    const titleField = within(dialog).getByLabelText('Title')
    await user.clear(titleField)
    await user.type(titleField, 'Custom video edited')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(screen.getByText('Custom video edited')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Move Custom video edited up' }))
    const ids = mlCourse().days.find((d) => d.id === day.id)!.videos.map((video) => video.id)
    expect(ids[ids.length - 2]).toBe(added.id)

    await user.click(screen.getByRole('button', { name: 'Mark Custom video edited complete' }))
    expect(mlCourse().days.find((d) => d.id === day.id)!.videos.at(-2)!.completed).toBe(true)
    expect(screen.getByText('25%')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete Custom video edited' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(screen.queryByText('Custom video edited')).not.toBeInTheDocument()
    expect(courseStats(mlCourse()).total).toBe(before)
    expect(courseStats(mlCourse()).completed).toBe(0)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('marks every video in a day complete and detects the next incomplete day', async () => {
    const user = userEvent.setup()
    const course = mlCourse()
    const day = dayByOrder(1)
    await renderAt(`/learning/${course.id}/day/${day.id}`)

    await user.click(screen.getByRole('button', { name: /Mark all/i }))

    expect(courseStats(mlCourse()).completed).toBe(3)
    expect(screen.getByText(/Next incomplete day:/)).toBeInTheDocument()
    expect(screen.getByText(/Day 2 ·/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Reset/i }))
    expect(courseStats(mlCourse()).completed).toBe(0)
  })

  it('adds, edits and deletes a code file', async () => {
    const user = userEvent.setup()
    const course = mlCourse()
    const day = dayByOrder(5)
    await renderAt(`/learning/${course.id}/day/${day.id}`)

    await user.click(screen.getByRole('button', { name: /Add file/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('File name'), 'matmul.py')
    await user.type(within(dialog).getByLabelText('Code'), 'import numpy as np')
    await user.click(within(dialog).getByRole('button', { name: 'Add file' }))

    expect(screen.getByText('matmul.py')).toBeInTheDocument()
    expect(screen.getByText('import numpy as np')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit matmul.py' }))
    const editDialog = screen.getByRole('dialog')
    const code = within(editDialog).getByLabelText('Code')
    await user.clear(code)
    await user.type(code, 'print("updated")')
    await user.click(within(editDialog).getByRole('button', { name: 'Save file' }))
    expect(screen.getByText('print("updated")')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete matmul.py' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.queryByText('matmul.py')).not.toBeInTheDocument()
  })

  it('points Continue Learning at the first incomplete video', async () => {
    const user = userEvent.setup()
    await renderAt('/learning')

    const course = mlCourse()
    const firstDay = dayByOrder(1)
    const firstVideo = firstDay.videos[0]
    const resumeLink = screen.getAllByRole('link', { name: /Resume/i })[0]
    expect(resumeLink).toHaveAttribute(
      'href',
      `/learning/${course.id}/day/${firstDay.id}?video=${firstVideo.id}`
    )

    await user.click(screen.getByRole('link', { name: /Open course/i }))
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Machine Learning')
    expect(await screen.findByText(/Next up/)).toBeInTheDocument()
  })

  it('creates a new course and adds days to it', async () => {
    const user = userEvent.setup()
    await renderAt('/learning')

    await user.click(screen.getByRole('button', { name: /New course/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Title'), 'Operating Systems')
    await user.type(within(dialog).getByLabelText('Category'), 'CS Core')
    await user.click(within(dialog).getByRole('button', { name: 'Create course' }))

    expect(screen.getByText('Operating Systems')).toBeInTheDocument()
    const created = store().courses.find((course) => course.title === 'Operating Systems')!
    expect(created.days).toHaveLength(0)

    await user.click(screen.getAllByRole('link', { name: /Open course/i })[0])
    await user.click((await screen.findAllByRole('button', { name: /Add day/i }))[0])
    const dayDialog = screen.getByRole('dialog')
    await user.type(within(dayDialog).getByLabelText('Title'), 'Processes')
    await user.click(within(dayDialog).getByRole('button', { name: 'Add day' }))

    expect(screen.getByText('Processes')).toBeInTheDocument()
  })

  it('deletes a day and renumbers the rest', async () => {
    const user = userEvent.setup()
    const course = mlCourse()
    await renderAt(`/learning/${course.id}`)

    await user.click(screen.getByRole('button', { name: 'Delete day 2' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    const days = mlCourse().days
    expect(days).toHaveLength(29)
    expect(days[1].order).toBe(2)
    expect(days[1].title).not.toBe(course.days[1].title)
  })
})

describe('study log', () => {
  it('creates a subject and logs a session', async () => {
    const user = userEvent.setup()
    await renderAt('/study')

    await user.click(screen.getByRole('button', { name: /Subject/i }))
    const subjectDialog = screen.getByRole('dialog')
    await user.type(within(subjectDialog).getByLabelText('Name'), 'Databases')
    await user.click(within(subjectDialog).getByRole('button', { name: 'Add subject' }))
    expect(store().subjects.some((subject) => subject.name === 'Databases')).toBe(true)

    await user.click(screen.getByRole('button', { name: /Log session/i }))
    const sessionDialog = screen.getByRole('dialog')
    const minutesField = within(sessionDialog).getByLabelText('Minutes')
    await user.clear(minutesField)
    await user.type(minutesField, '75')
    await user.type(within(sessionDialog).getByLabelText('Notes'), 'Indexing')
    await user.click(within(sessionDialog).getByRole('button', { name: 'Log session' }))

    const session = store().studySessions.find((item) => item.notes === 'Indexing')
    expect(session?.minutes).toBe(75)
    expect(screen.getByText('Indexing')).toBeInTheDocument()
  })
})

describe('coding records', () => {
  it('creates a LeetCode record and toggles it solved', async () => {
    const user = userEvent.setup()
    await renderAt('/coding/leetcode')

    await user.click(screen.getByRole('button', { name: /Add problem/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Problem'), 'Valid Parentheses')
    await user.selectOptions(within(dialog).getByLabelText('Difficulty'), 'Medium')
    await user.type(within(dialog).getByLabelText('Topics'), 'Stack, String')
    await user.click(within(dialog).getByRole('button', { name: 'Add problem' }))

    expect(screen.getByText('Valid Parentheses')).toBeInTheDocument()
    expect(store().leetcode[0].topics).toEqual(['Stack', 'String'])

    await user.click(screen.getByRole('button', { name: 'Mark Valid Parentheses as solved' }))
    expect(store().leetcode.find((record) => record.title === 'Valid Parentheses')?.status).toBe('solved')
  })

  it('creates a competitive programming record', async () => {
    const user = userEvent.setup()
    await renderAt('/coding/cp')

    await user.click(screen.getByRole('button', { name: /Add problem/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Problem'), 'AtCoder ABC 370 D')
    const platformField = within(dialog).getByLabelText('Platform')
    await user.clear(platformField)
    await user.type(platformField, 'AtCoder')
    await user.type(within(dialog).getByLabelText('Rating'), '1350')
    await user.click(within(dialog).getByRole('button', { name: 'Add problem' }))

    const record = store().cp.find((item) => item.title === 'AtCoder ABC 370 D')
    expect(record?.platform).toBe('AtCoder')
    expect(record?.rating).toBe(1350)
  })

  it('logs a GitHub contribution', async () => {
    const user = userEvent.setup()
    await renderAt('/coding/github')

    await user.click(screen.getByRole('button', { name: /Log contribution/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Repository'), 'owner/awesome-repo')
    const commitsField = within(dialog).getByLabelText('Commits')
    await user.clear(commitsField)
    await user.type(commitsField, '7')
    await user.click(within(dialog).getByRole('button', { name: 'Log contribution' }))

    const record = store().github.find((item) => item.repo === 'owner/awesome-repo')
    expect(record?.commits).toBe(7)
  })
})

describe('projects and goals', () => {
  it('creates a project and links a task to a goal', async () => {
    const user = userEvent.setup()
    await renderAt('/projects')

    await user.click(screen.getByRole('button', { name: /New project/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'Compiler')
    await user.type(within(dialog).getByLabelText('Tech stack'), 'Rust, LLVM')
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }))

    const project = store().projects.find((item) => item.name === 'Compiler')
    expect(project?.techStack).toEqual(['Rust', 'LLVM'])
  })

  it('creates a goal with a category and target date', async () => {
    const user = userEvent.setup()
    await renderAt('/goals')

    await user.click(screen.getByRole('button', { name: /New goal/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Title'), 'Read 12 books')
    const categoryField = within(dialog).getByLabelText('Category')
    await user.clear(categoryField)
    await user.type(categoryField, 'Personal')
    await user.type(within(dialog).getByLabelText('Target date'), '2026-12-31')
    await user.click(within(dialog).getByRole('button', { name: 'Create goal' }))

    const created = store().goals.find((item) => item.title === 'Read 12 books')
    expect(created?.category).toBe('Personal')
    expect(created?.targetDate).toBe('2026-12-31')
  })

  it('links tasks to a goal and reflects the progress', async () => {
    const user = userEvent.setup()
    await renderAt('/goals')

    const goal = store().goals[0]
    const linkedBefore = store().tasks.filter((task) => task.goalIds.includes(goal.id)).length

    await user.click(screen.getAllByRole('button', { name: /Link tasks/i })[0])
    const dialog = screen.getByRole('dialog')
    const checkboxes = within(dialog).getAllByRole('checkbox')
    const unchecked = checkboxes.find((box) => !(box as HTMLInputElement).checked)!
    await user.click(unchecked)
    await user.click(within(dialog).getByRole('button', { name: 'Done' }))

    const linkedAfter = store().tasks.filter((task) => task.goalIds.includes(goal.id)).length
    expect(linkedAfter).toBe(linkedBefore + 1)
  })
})

describe('analytics, search and settings', () => {
  it('renders analytics without crashing', async () => {
    await renderAt('/analytics')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Analytics')
    expect(screen.getByText('Overall score')).toBeInTheDocument()
    expect(screen.getByText('Goal progress')).toBeInTheDocument()
  })

  it('searches across every module', async () => {
    const user = userEvent.setup()
    await renderAt('/search')

    await user.type(screen.getByLabelText('Search everything'), 'backpropagation')
    expect(screen.getAllByText('Video').length).toBeGreaterThan(0)
    expect(screen.getByText('Backpropagation by Hand')).toBeInTheDocument()
  })

  it('switches theme and applies the dark class', async () => {
    const user = userEvent.setup()
    await renderAt('/settings')

    await user.click(screen.getByRole('tab', { name: 'Dark' }))
    expect(store().settings.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    await user.click(screen.getByRole('tab', { name: 'Light' }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('updates the profile name', async () => {
    const user = userEvent.setup()
    await renderAt('/settings')

    const nameField = screen.getByLabelText('Name')
    await user.clear(nameField)
    await user.type(nameField, 'Ada')
    await user.click(screen.getByRole('button', { name: /Save profile/i }))

    expect(store().profile.name).toBe('Ada')
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('validates an invalid import instead of silently failing', async () => {
    const user = userEvent.setup()
    await renderAt('/settings')

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['{ broken json'], 'backup.json', { type: 'application/json' })
    await user.upload(input, file)

    expect(await screen.findByText(/not valid JSON/i)).toBeInTheDocument()
  })

  it('imports a valid backup through the review dialog', async () => {
    const user = userEvent.setup()
    const result = await renderAt('/settings')

    const payload = {
      app: 'personal-os',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        tasks: [{ id: 'imported-1', title: 'Imported task', completed: false }],
        habits: [],
        courses: [],
      },
    }
    const file = new File([JSON.stringify(payload)], 'backup.json', { type: 'application/json' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    expect(await screen.findByText(/Review what was found/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Replace everything' }))

    expect(store().tasks).toHaveLength(1)
    expect(store().tasks[0].title).toBe('Imported task')
    result.unmount()
  })

  it('deletes all data from the danger zone', async () => {
    const user = userEvent.setup()
    await renderAt('/settings')

    await user.click(screen.getByRole('button', { name: /Delete all data/i }))
    await user.click(screen.getByRole('button', { name: 'Delete everything' }))

    expect(store().tasks).toHaveLength(0)
    expect(store().courses).toHaveLength(0)
  })

  it('downloads a real backup file when export is clicked', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.spyOn(URL, 'createObjectURL')
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    await renderAt('/settings')
    await user.click(screen.getByRole('button', { name: /Export data/i }))

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clickSpy).toHaveBeenCalledOnce()

    createObjectURL.mockRestore()
    clickSpy.mockRestore()
  })
})

describe('controls and responsive shell', () => {
  it('applies the selected colour when creating a habit', async () => {
    const user = userEvent.setup()
    await renderAt('/habits')

    await user.click(screen.getByRole('button', { name: /New habit/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'Meditate')
    await user.click(within(dialog).getByRole('button', { name: 'Colour #8b5cf6' }))
    await user.click(within(dialog).getByRole('button', { name: 'Create habit' }))

    expect(store().habits.find((habit) => habit.name === 'Meditate')?.color).toBe('#8b5cf6')
  })

  it('opens and closes the mobile navigation drawer', async () => {
    const user = userEvent.setup()
    await renderAt('/')

    const desktopNavLinks = screen.getAllByRole('link', { name: 'Dashboard' }).length
    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    expect(screen.getAllByRole('link', { name: 'Dashboard' }).length).toBe(desktopNavLinks + 1)

    await user.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(screen.getAllByRole('link', { name: 'Dashboard' }).length).toBe(desktopNavLinks)
  })

  it('navigates between modules from the sidebar', async () => {
    const user = userEvent.setup()
    await renderAt('/')

    await user.click(screen.getByRole('link', { name: /Analytics/i }))
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Analytics')

    await user.click(screen.getByRole('link', { name: /Habits/i }))
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Habits')
  })

  it('recalculates the dashboard score when data changes', async () => {
    const user = userEvent.setup()
    await renderAt('/')

    const before = screen.getByText('Tasks completed').nextElementSibling?.textContent
    await user.click(screen.getByRole('button', { name: 'Complete Review ML Day 1 notes' }))

    expect(screen.getByText('Tasks completed').nextElementSibling?.textContent).not.toBe(before)
  })
})
