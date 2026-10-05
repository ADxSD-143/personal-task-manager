import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useStore } from '@/store/useStore'
import type { CodeFile, Course, CourseDay, Video } from '@/types'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#ec4899']
const LANGUAGES = ['python', 'javascript', 'typescript', 'c', 'cpp', 'java', 'sql', 'r', 'bash', 'other']

function useSeededState<T>(key: string, initial: () => T): [T, (value: T) => void] {
  const [storedKey, setStoredKey] = useState<string | null>(null)
  const [value, setValue] = useState<T>(initial)
  if (storedKey !== key) {
    setStoredKey(key)
    setValue(initial())
  }
  return [value, setValue]
}

export function CourseDialog({
  open,
  onClose,
  course,
}: {
  open: boolean
  onClose: () => void
  course?: Course | null
}) {
  const addCourse = useStore((state) => state.addCourse)
  const updateCourse = useStore((state) => state.updateCourse)
  const [error, setError] = useState('')
  const [title, setTitle] = useSeededState(`${course?.id ?? 'new'}-${open}`, () => course?.title ?? '')
  const [description, setDescription] = useSeededState(`${course?.id ?? 'new'}-${open}-d`, () => course?.description ?? '')
  const [category, setCategory] = useSeededState(`${course?.id ?? 'new'}-${open}-c`, () => course?.category ?? 'General')
  const [color, setColor] = useSeededState(`${course?.id ?? 'new'}-${open}-col`, () => course?.color ?? COLORS[0])

  const submit = () => {
    if (!title.trim()) {
      setError('A title is required.')
      return
    }
    const payload = { title: title.trim(), description: description.trim(), category: category.trim() || 'General', color }
    if (course) updateCourse(course.id, payload)
    else addCourse(payload)
    setError('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={course ? 'Edit course' : 'New course'}
      description="Group lessons into days so progress is easy to see."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{course ? 'Save changes' : 'Create course'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" error={error}>
          <TextInput value={title} autoFocus onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Machine Learning" />
        </Field>
        <Field label="Description">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will you be able to do at the end?" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <TextInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="AI / ML" />
          </Field>
          <Field label="Colour">
            <div className="flex flex-wrap gap-2 pt-1">
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
      </div>
    </Modal>
  )
}

export function DayDialog({
  open,
  onClose,
  courseId,
  day,
}: {
  open: boolean
  onClose: () => void
  courseId: string
  day?: CourseDay | null
}) {
  const addDay = useStore((state) => state.addDay)
  const updateDay = useStore((state) => state.updateDay)
  const [error, setError] = useState('')
  const key = `${courseId}-${day?.id ?? 'new'}-${open}`
  const [title, setTitle] = useSeededState(key, () => day?.title ?? '')
  const [description, setDescription] = useSeededState(`${key}-d`, () => day?.description ?? '')

  const submit = () => {
    if (!title.trim()) {
      setError('A title is required.')
      return
    }
    if (day) updateDay(courseId, day.id, { title: title.trim(), description: description.trim() })
    else addDay(courseId, title.trim(), description.trim())
    setError('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={day ? `Edit day ${day.order}` : 'New day'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{day ? 'Save changes' : 'Add day'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" error={error}>
          <TextInput value={title} autoFocus onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Gradient Descent" />
        </Field>
        <Field label="Description">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this day cover?" />
        </Field>
      </div>
    </Modal>
  )
}

export function VideoDialog({
  open,
  onClose,
  courseId,
  dayId,
  video,
}: {
  open: boolean
  onClose: () => void
  courseId: string
  dayId: string
  video?: Video | null
}) {
  const addVideo = useStore((state) => state.addVideo)
  const updateVideo = useStore((state) => state.updateVideo)
  const [error, setError] = useState('')
  const key = `${dayId}-${video?.id ?? 'new'}-${open}`
  const [title, setTitle] = useSeededState(key, () => video?.title ?? '')
  const [url, setUrl] = useSeededState(`${key}-u`, () => video?.url ?? '')
  const [duration, setDuration] = useSeededState(`${key}-dur`, () => String(video?.duration ?? 10))

  const submit = () => {
    if (!title.trim()) {
      setError('A title is required.')
      return
    }
    const minutes = Math.max(1, Number(duration) || 10)
    if (video) updateVideo(courseId, dayId, video.id, { title: title.trim(), url: url.trim(), duration: minutes })
    else addVideo(courseId, dayId, { title: title.trim(), url: url.trim(), duration: minutes })
    setError('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={video ? 'Edit video' : 'Add video'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{video ? 'Save changes' : 'Add video'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" error={error}>
          <TextInput value={title} autoFocus onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Backpropagation by hand" />
        </Field>
        <Field label="Link" hint="YouTube or any other URL">
          <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Duration (minutes)">
          <TextInput
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  )
}

export function CodeFileDialog({
  open,
  onClose,
  courseId,
  dayId,
  file,
}: {
  open: boolean
  onClose: () => void
  courseId: string
  dayId: string
  file?: CodeFile | null
}) {
  const addCodeFile = useStore((state) => state.addCodeFile)
  const updateCodeFile = useStore((state) => state.updateCodeFile)
  const [error, setError] = useState('')
  const key = `${dayId}-${file?.id ?? 'new'}-${open}`
  const [name, setName] = useSeededState(key, () => file?.name ?? '')
  const [language, setLanguage] = useSeededState(`${key}-l`, () => file?.language ?? 'python')
  const [content, setContent] = useSeededState(`${key}-c`, () => file?.content ?? '')

  const submit = () => {
    if (!name.trim()) {
      setError('A file name is required.')
      return
    }
    if (file) updateCodeFile(courseId, dayId, file.id, { name: name.trim(), language, content })
    else addCodeFile(courseId, dayId, { name: name.trim(), language, content })
    setError('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={file ? `Edit ${file.name}` : 'Add code file'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{file ? 'Save file' : 'Add file'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="File name" error={error}>
            <TextInput value={name} autoFocus onChange={(e) => setName(e.target.value)} placeholder="gradient_descent.py" />
          </Field>
          <Field label="Language">
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Code">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            rows={14}
            className="input font-mono text-xs leading-relaxed"
            placeholder="# paste your notes or solution here"
          />
        </Field>
      </div>
    </Modal>
  )
}
