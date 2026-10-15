import React, { createContext, useContext, useEffect, useState, useTransition } from 'react'
import { Moon, Sun } from 'lucide-react'

export type Theme = 'light' | 'dark'
export type ThemePreference = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  preference: ThemePreference
  setPreference: (pref: ThemePreference) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const STORAGE_KEY = 'cardiovista.theme'

function getInitialPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved
    }
  } catch {
    // Ignore storage errors
  }
  return 'system'
}

function resolveTheme(pref: ThemePreference): Theme {
  if (pref === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }
  return pref
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(getInitialPreference)
  const [resolved, setResolved] = useState<Theme>(() => resolveTheme(getInitialPreference()))
  const [, startTransition] = useTransition()

  useEffect(() => {
    // Remove no-transitions once mounted
    const timer = requestAnimationFrame(() => {
      document.body.classList.remove('no-transitions')
    })
    return () => cancelAnimationFrame(timer)
  }, [])

  useEffect(() => {
    const active = resolveTheme(preference)
    setResolved(active)
    document.documentElement.setAttribute('data-theme', active)
    document.documentElement.style.colorScheme = active

    if (preference === 'system' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = (e: MediaQueryListEvent) => {
        const nextTheme = e.matches ? 'dark' : 'light'
        setResolved(nextTheme)
        document.documentElement.setAttribute('data-theme', nextTheme)
        document.documentElement.style.colorScheme = nextTheme
      }
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    }
  }, [preference])

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref)
    try {
      localStorage.setItem(STORAGE_KEY, pref)
    } catch {
      // Storage unavailable
    }
  }

  const toggle = () => {
    startTransition(() => {
      const next: ThemePreference = resolved === 'dark' ? 'light' : 'dark'
      setPreference(next)
    })
  }

  return (
    <ThemeContext.Provider value={{ theme: resolved, preference, setPreference, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}

export function useThemeColors() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return {
    isDark,
    canvas: isDark ? '#0b1220' : '#f6f8fa',
    surface: isDark ? '#111a2b' : '#ffffff',
    surface2: isDark ? '#17233a' : '#f0f3f6',
    line: isDark ? '#24334d' : '#e3e8ee',
    ink: isDark ? '#e6edf7' : '#0f2a43',
    ink2: isDark ? '#aebbd0' : '#41566e',
    ink3: isDark ? '#7d8ca6' : '#6b7f96',
    accent: isDark ? '#2dd4bf' : '#0d9488',
    accentSoft: isDark ? 'rgba(45, 212, 191, 0.12)' : '#e6f6f4',
    danger: isDark ? '#f87171' : '#dc2626',
    warn: isDark ? '#fbbf24' : '#b45309',
    ok: isDark ? '#34d399' : '#059669',
    info: isDark ? '#60a5fa' : '#2563a8',
  }
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent ${className}`}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <Sun
        className={`h-4 w-4 transition-all duration-250 ${
          isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
        }`}
        aria-hidden
      />
      <Moon
        className={`absolute h-4 w-4 transition-all duration-250 ${
          isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
        }`}
        aria-hidden
      />
    </button>
  )
}