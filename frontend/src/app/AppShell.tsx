import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Activity, BarChart3, ClipboardList, FileSpreadsheet, HeartPulse, History, Info, LayoutDashboard, Menu, ShieldAlert, X,
} from 'lucide-react'
import { useAppData } from './AppData'
import { Badge, cx } from '../components/ui'

export const DISCLAIMER =
  'This application is a research and educational prototype. Its outputs are not a diagnosis and do not replace professional medical assessment or formal diagnostic imaging.'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/assessment', label: 'New Assessment', icon: ClipboardList },
  { to: '/import', label: 'Excel Import', icon: FileSpreadsheet },
  { to: '/explorer', label: '3D Heart Explorer', icon: HeartPulse },
  { to: '/history', label: 'Prediction History', icon: History },
  { to: '/evaluation', label: 'Model Evaluation', icon: BarChart3 },
  { to: '/about', label: 'Settings / About', icon: Info },
]

export function ModelStatusBadge() {
  const { apiOnline, modelInfo } = useAppData()
  if (apiOnline === null) return <Badge>Checking API…</Badge>
  if (!apiOnline) return <Badge tone="red">API offline</Badge>
  if (modelInfo?.status === 'ready') return <Badge tone="teal">Model ready</Badge>
  return <Badge tone="red">Model unavailable</Badge>
}

export default function AppShell() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const current = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label ?? 'Results'

  return (
    <div className="flex min-h-full">
      {open && <div className="fixed inset-0 z-30 bg-navy-950/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside className={cx(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-white transition-transform lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full')} aria-label="Primary">
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy-900 text-teal-300"><Activity className="h-5 w-5" aria-hidden /></span>
            <span className="font-display text-xl font-semibold tracking-tight text-navy-900">CardioVista</span>
          </div>
          <button className="rounded-lg p-1.5 text-navy-500 hover:bg-canvas lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) => cx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-teal-soft text-teal-800' : 'text-navy-700 hover:bg-canvas')}>
              <Icon className="h-[18px] w-[18px]" aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="m-3 rounded-xl bg-canvas p-3 text-xs leading-relaxed text-navy-500">
          <p className="mb-1 flex items-center gap-1.5 font-semibold text-navy-700"><ShieldAlert className="h-3.5 w-3.5" aria-hidden /> Research prototype</p>
          Not a diagnostic device.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur sm:px-8">
          <button className="rounded-lg p-2 text-navy-700 hover:bg-canvas lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <h1 className="text-[15px] font-semibold text-navy-900">{current}</h1>
          <div className="ml-auto"><ModelStatusBadge /></div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-8">
          <Outlet />
        </main>

        <footer role="note" className="sticky bottom-0 z-20 border-t border-amber-300/70 bg-amber-50/95 px-4 py-2 text-center text-xs text-amber-950 backdrop-blur sm:px-8">
          <strong className="font-semibold">Disclaimer:</strong> {DISCLAIMER}
        </footer>
      </div>
    </div>
  )
}
