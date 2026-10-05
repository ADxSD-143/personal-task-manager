import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpen,
  CheckSquare,
  FolderKanban,
  Github,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Repeat,
  Search,
  Settings,
  Target,
  Trophy,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const NAV: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/search', label: 'Search', icon: Search },
    ],
  },
  {
    label: 'Plan',
    items: [
      { to: '/tasks', label: 'Tasks', icon: CheckSquare },
      { to: '/habits', label: 'Habits', icon: Repeat },
      { to: '/goals', label: 'Goals', icon: Target },
      { to: '/projects', label: 'Projects', icon: FolderKanban },
    ],
  },
  {
    label: 'Learn',
    items: [
      { to: '/learning', label: 'Courses', icon: GraduationCap },
      { to: '/study', label: 'Study log', icon: BookOpen },
    ],
  },
  {
    label: 'Practice',
    items: [
      { to: '/coding/leetcode', label: 'LeetCode', icon: ListChecks },
      { to: '/coding/cp', label: 'Competitive', icon: Trophy },
      { to: '/coding/github', label: 'GitHub', icon: Github },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]
