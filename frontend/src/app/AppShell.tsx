import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  ClipboardList,
  FileHeart,
  FileSpreadsheet,
  HeartPulse,
  History,
  Info,
  LayoutDashboard,
  Menu,
  ShieldAlert,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useAppData } from './AppData'
import { Badge, cx } from '../components/ui'
import { ThemeToggle } from './theme'
import { usePrefersReducedMotion } from '../components/motion'

export const DISCLAIMER =
  'This application is a research and educational prototype. Its outputs are not a diagnosis and do not replace professional medical assessment or formal diagnostic imaging.'

export interface ShellContextType {
  wide: boolean
  setWide: (w: boolean) => void
}

const PRIMARY_NAV = [
  { to: '/', label: 'Report', icon: FileHeart, end: true },
  { to: '/assessment', label: 'New Assessment', icon: ClipboardList },
  { to: '/import', label: 'Batch Import', icon: FileSpreadsheet },
  { to: '/history', label: 'History', icon: History },
  { to: '/evaluation', label: 'Model Evaluation', icon: BarChart3 },
  { to: '/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/about', label: 'Settings / About', icon: Info },
]

const EXPLORE_NAV = [
  { to: '/explorer', label: '3D Heart Explorer', icon: HeartPulse, badge: 'Demo' },
]

export function ModelStatusBadge() {
  const { apiOnline, modelInfo } = useAppData()
  if (apiOnline === null) return <Badge>Checking API...</Badge>
  if (!apiOnline) return <Badge tone="red">API offline</Badge>
  if (modelInfo?.status === 'ready') return <Badge tone="teal">Model ready</Badge>
  return <Badge tone="red">Model unavailable</Badge>
}

export default function AppShell() {
  const [open, setOpen] = useState(false)
  const [wide, setWide] = useState(false)
  const { pathname } = useLocation()
  const reducedMotion = usePrefersReducedMotion()

  const allNav = [...PRIMARY_NAV, ...EXPLORE_NAV]
  const current =
    allNav.find((n) => ('end' in n && n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label ??
    (pathname.startsWith('/results') ? 'Assessment Report' : 'CardioVista')

  return (
    <div className="flex min-h-full bg-canvas text-ink">
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-xs lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Primary"
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-line/60">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-accent shadow-xs">
              <Activity className="h-5 w-5" aria-hidden />
            </span>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-ink leading-tight">
                CardioVista
              </span>
              <span className="text-[10px] tracking-wider uppercase text-ink-3 font-medium">
                CAD Analysis
              </span>
            </div>
          </div>
          <button
            className="rounded-lg p-1.5 text-ink-2 hover:bg-surface-2 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          <div className="space-y-1">
            {PRIMARY_NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cx(
                    'relative group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'text-accent font-semibold'
                      : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId={reducedMotion ? undefined : 'sidebar-active'}
                        className="absolute inset-0 rounded-xl bg-accent-soft border border-accent/20"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-3 truncate">
                      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                      <span className="truncate">{label}</span>
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>

          <div className="pt-4">
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Explore
            </div>
            <div className="space-y-1">
              {EXPLORE_NAV.map(({ to, label, icon: Icon, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cx(
                      'relative group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'text-accent font-semibold'
                        : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId={reducedMotion ? undefined : 'sidebar-active'}
                          className="absolute inset-0 rounded-xl bg-accent-soft border border-accent/20"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      <div className="relative z-10 flex items-center gap-3 truncate">
                        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                        <span className="truncate">{label}</span>
                      </div>
                      {badge && (
                        <span className="relative z-10 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-3 border border-line">
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        <div className="m-3 rounded-xl border border-line bg-surface-2 p-3 text-xs leading-relaxed text-ink-3">
          <p className="mb-1 flex items-center gap-1.5 font-semibold text-ink">
            <ShieldAlert className="h-3.5 w-3.5 text-warn" aria-hidden /> Research prototype
          </p>
          Not a diagnostic device. Confirm all findings with a qualified clinician.
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-md sm:px-8">
          <button
            className="rounded-lg p-2 text-ink-2 hover:bg-surface-2 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-[15px] font-semibold text-ink">{current}</h1>
          <div className="ml-auto flex items-center gap-3">
            <ModelStatusBadge />
            <ThemeToggle />
          </div>
        </header>

        <main
          className={cx(
            'mx-auto w-full flex-1 px-4 py-6 sm:px-8',
            wide ? 'max-w-[1760px] min-w-0' : 'max-w-[1400px] min-w-0'
          )}
        >
          {reducedMotion ? (
            <Outlet context={{ wide, setWide }} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <Outlet context={{ wide, setWide }} />
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        <footer
          role="note"
          className="sticky bottom-0 z-20 border-t border-warn/30 bg-warn-soft/95 px-4 py-2 text-center text-xs text-ink backdrop-blur-md sm:px-8"
        >
          <strong className="font-semibold text-warn">Disclaimer:</strong> {DISCLAIMER}
        </footer>
      </div>
    </div>
  )
}