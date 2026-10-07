import { FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, TextArea, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { matchesQuery } from '@/lib/search'
import { useStore } from '@/store/useStore'
import type { Note } from '@/types'

function NoteDialog({ open, note, onClose }: { open: boolean; note: Note | null; onClose: () => void }) {
  const addNote = useStore((state) => state.addNote)
  const updateNote = useStore((state) => state.updateNote)
  const [key, setKey] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')
  const formKey = `${note?.id ?? 'new'}-${open}`
  if (key !== formKey) {
    setKey(formKey)
    setTitle(note?.title ?? '')
    setContent(note?.content ?? '')
    setTags(note?.tags.join(', ') ?? '')
    setError('')
  }

  const submit = () => {
    if (!title.trim()) {
      setError('A title is required.')
      return
    }
    const fields = {
      title: title.trim(),
      content: content.trim(),
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    }
    if (note) updateNote(note.id, fields)
    else addNote(fields)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={note ? 'Edit note' : 'New note'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>{note ? 'Save changes' : 'Create note'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" error={error}>
          <TextInput value={title} autoFocus onChange={(event) => setTitle(event.target.value)} placeholder="Note title" />
        </Field>
        <Field label="Content">
          <TextArea className="min-h-40" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write your note…" />
        </Field>
        <Field label="Tags" hint="Separate tags with commas.">
          <TextInput value={tags} onChange={(event) => setTags(event.target.value)} placeholder="study, idea" />
        </Field>
      </div>
    </Modal>
  )
}

export default function Notes() {
  const notes = useStore((state) => state.notes)
  const removeNote = useStore((state) => state.removeNote)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Note | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null)

  const visible = useMemo(
    () => [...notes]
      .filter((note) => matchesQuery(query, note.title, note.content, ...note.tags))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes, query]
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notes"
        description="Notes are saved to your account and available on every device."
        actions={
          <Button onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}>
            <Plus className="h-4 w-4" /> New note
          </Button>
        }
      />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <TextInput className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes…" aria-label="Search notes" />
      </div>
      {visible.length === 0 ? (
        <Card><CardBody><EmptyState icon={FileText} title={notes.length ? 'No matching notes' : 'No notes yet'} description={notes.length ? 'Try a different search.' : 'Create a note to capture ideas, plans or study notes.'} /></CardBody></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((note) => (
            <Card key={note.id}>
              <CardHeader
                title={note.title}
                description={new Date(note.updatedAt).toLocaleDateString()}
                action={
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${note.title}`} onClick={() => {
                      setEditing(note)
                      setDialogOpen(true)
                    }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${note.title}`} onClick={() => setPendingDelete(note)}>
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                }
              />
              <CardBody className="space-y-3">
                <p className="line-clamp-6 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{note.content || 'No content'}</p>
                {note.tags.length ? <div className="flex flex-wrap gap-1">{note.tags.map((tag) => <Badge key={tag} tone="slate">{tag}</Badge>)}</div> : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      <NoteDialog open={dialogOpen} note={editing} onClose={() => setDialogOpen(false)} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete note"
        message={`Delete "${pendingDelete?.title ?? ''}"?`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeNote(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
