import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Tasks = lazy(() => import('@/pages/Tasks'))
const Habits = lazy(() => import('@/pages/Habits'))
const Fitness = lazy(() => import('@/pages/Fitness'))
const Notes = lazy(() => import('@/pages/Notes'))
const Goals = lazy(() => import('@/pages/Goals'))
const Projects = lazy(() => import('@/pages/Projects'))
const Study = lazy(() => import('@/pages/Study'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const Search = lazy(() => import('@/pages/Search'))
const Settings = lazy(() => import('@/pages/Settings'))
const Courses = lazy(() => import('@/pages/learning/Courses'))
const CourseDetail = lazy(() => import('@/pages/learning/CourseDetail'))
const DayDetail = lazy(() => import('@/pages/learning/DayDetail'))
const LeetCode = lazy(() => import('@/pages/coding/LeetCode'))
const Competitive = lazy(() => import('@/pages/coding/Competitive'))
const GitHub = lazy(() => import('@/pages/coding/GitHub'))

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600 dark:border-slate-700 dark:border-t-brand-400" />
        Loading…
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="habits" element={<Habits />} />
          <Route path="fitness" element={<Fitness />} />
          <Route path="notes" element={<Notes />} />
          <Route path="goals" element={<Goals />} />
          <Route path="projects" element={<Projects />} />
          <Route path="learning" element={<Courses />} />
          <Route path="learning/:courseId" element={<CourseDetail />} />
          <Route path="learning/:courseId/day/:dayId" element={<DayDetail />} />
          <Route path="study" element={<Study />} />
          <Route path="coding">
            <Route index element={<Navigate to="/coding/leetcode" replace />} />
            <Route path="leetcode" element={<LeetCode />} />
            <Route path="cp" element={<Competitive />} />
            <Route path="github" element={<GitHub />} />
          </Route>
          <Route path="analytics" element={<Analytics />} />
          <Route path="search" element={<Search />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
