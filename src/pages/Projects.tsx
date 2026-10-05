import { ExternalLink, FolderKanban, Github, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatCard } from '@/components/ui/StatCard'
import { formatDate, toKey } from '@/lib/date'
import { matchesQuery } from '@/lib/search'
import { useStore } from '@/store/useStore'
import type { Project } from '@/types'

type Status = Project['status']

const STATUS_LABEL: Record<Status, string> = {
  idea: 'Idea',
  active: 'Active',
  paused: 'Paused',
  done: 'Done',
}

const STATUS_TONE: Record<Status, 'slate' | 'green' | 'amber' | 'sky'> = {
  idea: 'slate',
  active: 'green',
  paused: 'amber',
  done: 'sky',
}

function ProjectDialog({
  open,
  onClose,
  project,
}: {
  open: boolean
  onClose: () => void
  project?: Project | null
}) {
  const addProject = useStore((state) => state.addProject)
  const updateProject = useStore((state) => state.updateProject)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Status>('idea')
  const [techStack, setTechStack] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [liveUrl, setLiveUrl] = useState('')
  const [error, setError] = useState('')
  const [key, setKey] = useState<string | null>(null)

  const currentKey = `${project?.id ?? 'new'}-${open}`
  if (key !== currentKey) {
    setKey(currentKey)
    setName(project?.name ?? '')
    setDescription(project?.description ?? '')
    setStatus(project?.status ?? 'idea')
    setTechStack((project?.techStack ?? []).join(', '))
    setRepoUrl(project?.repoUrl ?? '')
    setLiveUrl(project?.liveUrl ?? '')
    setError('')
  }

  const submit = () => {
    if (!name.trim()) {
      setError('A project name is required.')
      return
    }
    const payload = {
      name: name.trim(),
      description: description.trim(),
      status,
      techStack: techStack
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      repoUrl: repoUrl.trim(),
      liveUrl: liveUrl.trim(),
    }
    if (project) updateProject(project.id, payload)
    else addProject(payload)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? 'Edit project' : 'New project'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{project ? 'Save changes' : 'Create project'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" error={error}>
          <TextInput value={name} autoFocus onChange={(e) => setName(e.target.value)} placeholder="e.g. Personal OS" />
        </Field>
        <Field label="Description">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What are you building and why?" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              <option value="idea">Idea</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="done">Done</option>
            </Select>
          </Field>
          <Field label="Tech stack" hint="Comma separated">
            <TextInput value={techStack} onChange={(e) => setTechStack(e.target.value)} placeholder="React, TypeScript" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Repository URL">
            <TextInput value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/…" />
          </Field>
          <Field label="Live URL">
            <TextInput value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://…" />
          </Field>
        </div>
      </div>
    </Modal>
  )
}

export default function Projects() {
  const projects = useStore((state) => state.projects)
  const tasks = useStore((state) => state.tasks)
  const removeProject = useStore((state) => state.removeProject)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null)
  const [status, setStatus] = useState<'all' | Status>('all')
  const [query, setQuery] = useState('')

  const counts = {
    all: projects.length,
    idea: projects.filter((p) => p.status === 'idea').length,
    active: projects.filter((p) => p.status === 'active').length,
    paused: projects.filter((p) => p.status === 'paused').length,
    done: projects.filter((p) => p.status === 'done').length,
  }

  const visible = useMemo(
    () =>
      projects
        .filter((project) => status === 'all' || project.status === status)
        .filter((project) => matchesQuery(query, project.name, project.description, project.techStack)),
    [projects, status, query]
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects"
        description="Everything you are building, with the tasks attached to each one."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> New project
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active" value={counts.active} hint={`${counts.all} projects in total`} icon={FolderKanban} tone="text-emerald-500" />
        <StatCard label="Ideas" value={counts.idea} hint="Waiting to start" icon={FolderKanban} />
        <StatCard label="Paused" value={counts.paused} hint="On hold for now" icon={FolderKanban} tone="text-amber-500" />
        <StatCard label="Done" value={counts.done} hint="Shipped and closed" icon={FolderKanban} tone="text-sky-500" />
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            ariaLabel="Filter projects"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'active', label: 'Active', count: counts.active },
              { value: 'idea', label: 'Ideas', count: counts.idea },
              { value: 'paused', label: 'Paused', count: counts.paused },
              { value: 'done', label: 'Done', count: counts.done },
            ]}
          />
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              className="pl-9"
              aria-label="Search projects"
            />
          </div>
        </div>
      </Card>

      {visible.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={projects.length === 0 ? 'No projects yet' : 'No projects match'}
          description={projects.length === 0 ? 'Track what you are building so tasks have a home.' : 'Try a different filter.'}
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> New project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => {
            const linked = tasks.filter((task) => task.projectId === project.id)
            const completed = linked.filter((task) => task.completed).length
            const percent = linked.length === 0 ? 0 : Math.round((completed / linked.length) * 100)
            return (
              <Card key={project.id} className="flex flex-col">
                <CardHeader
                  title={project.name}
                  description={project.description || 'No description'}
                  action={
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${project.name}`}
                        onClick={() => {
                          setEditing(project)
                          setDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Delete ${project.name}`} onClick={() => setPendingDelete(project)}>
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </div>
                  }
                />
                <CardBody className="flex flex-1 flex-col gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={STATUS_TONE[project.status]}>{STATUS_LABEL[project.status]}</Badge>
                    {project.techStack.map((tech) => (
                      <Badge key={tech} tone="slate">
                        {tech}
                      </Badge>
                    ))}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {completed}/{linked.length} tasks done
                      </span>
                      <span className="tabular-nums">{percent}%</span>
                    </div>
                    <ProgressBar value={percent} className="mt-1.5" label={`${project.name} tasks complete`} />
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Created {formatDate(toKey(project.createdAt))}</p>

                  <div className="mt-auto flex flex-wrap gap-2">
                    {project.repoUrl ? (
                      <a href={project.repoUrl} target="_blank" rel="noreferrer noopener">
                        <Button variant="outline" size="sm">
                          <Github className="h-3.5 w-3.5" /> Repository
                        </Button>
                      </a>
                    ) : null}
                    {project.liveUrl ? (
                      <a href={project.liveUrl} target="_blank" rel="noreferrer noopener">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-3.5 w-3.5" /> Live
                        </Button>
                      </a>
                    ) : null}
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <ProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} project={editing} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete project"
        message={`"${pendingDelete?.name ?? ''}" will be deleted. Tasks linked to it stay, but become unassigned.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeProject(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
