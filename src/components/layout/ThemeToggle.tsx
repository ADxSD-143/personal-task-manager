import { Monitor, Moon, Sun } from 'lucide-react'
import type { Theme } from '@/types'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'

const ORDER: Theme[] = ['light', 'dark', 'system']

const META: Record<Theme, { icon: typeof Sun; label: string }> = {
  light: { icon: Sun, label: 'Light theme' },
  dark: { icon: Moon, label: 'Dark theme' },
  system: { icon: Monitor, label: 'System theme' },
}

export function ThemeToggle() {
  const theme = useStore((state) => state.settings.theme)
  const setSettings = useStore((state) => state.setSettings)
  const { icon: Icon, label } = META[theme]

  const next = () => {
    const index = ORDER.indexOf(theme)
    setSettings({ theme: ORDER[(index + 1) % ORDER.length] })
  }

  return (
    <Button variant="ghost" size="icon" onClick={next} title={label} aria-label={label}>
      <Icon className="h-4 w-4" />
    </Button>
  )
}
