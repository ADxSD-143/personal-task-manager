import { Search as SearchIcon, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { searchAll } from '@/lib/search'
import { useStore } from '@/store/useStore'

export default function Search() {
  const state = useStore()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('All')

  const results = useMemo(() => searchAll(state, query), [state, query])
  const types = useMemo(() => ['All', ...Array.from(new Set(results.map((result) => result.type)))], [results])
  const visible = type === 'All' ? results : results.filter((result) => result.type === type)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Search"
        description="One search box across tasks, habits, courses, videos, practice logs, projects and goals."
      />

      <Card className="p-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search everything…"
            aria-label="Search everything"
            className="input h-11 pl-9 pr-10 text-base"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {results.length > 0 ? (
          <div className="mt-3">
            <SegmentedControl
              ariaLabel="Filter results by type"
              value={type}
              onChange={setType}
              options={types.map((value) => ({
                value,
                label: value,
                count: value === 'All' ? results.length : results.filter((r) => r.type === value).length,
              }))}
            />
          </div>
        ) : null}
      </Card>

      {!query.trim() ? (
        <EmptyState
          icon={SearchIcon}
          title="Start typing to search"
          description="Try a task name, a topic, a repository or a course day."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title={`No results for "${query}"`}
          description={type === 'All' ? 'Try a different keyword.' : 'Try a different type filter.'}
        />
      ) : (
        <Card>
          <CardBody className="space-y-1">
            <p className="pb-2 text-xs text-slate-500 dark:text-slate-400">
              {visible.length} result{visible.length === 1 ? '' : 's'}
            </p>
            {visible.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                to={result.path}
                className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <Badge tone="brand">{result.type}</Badge>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {result.title}
                  </span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{result.subtitle}</span>
                </span>
                <Button variant="ghost" size="sm">
                  Open
                </Button>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
