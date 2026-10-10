import { useEffect, useState } from 'react'
import { riskColor, pct } from '../../lib/risk'
import { Badge, Card, cx } from '../../components/ui'
import type { TargetOutput, VesselId } from '../../types/api'
import { VESSELS, VESSEL_IDS } from '../heart-3d/vesselConfig'

export function ProbabilityBar({ p, className }: { p: number | null; className?: string }) {
  // Animate from 0 on mount / when the value changes.
  const [w, setW] = useState(0)
  useEffect(() => { const t = requestAnimationFrame(() => setW(p ?? 0)); return () => cancelAnimationFrame(t) }, [p])
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-navy-900/8', className)} role="meter"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={p == null ? undefined : Math.round(p * 100)} aria-label="Probability">
      {p != null && <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${w * 100}%`, background: riskColor(p) }} />}
    </div>
  )
}

export function OverallCard({ out }: { out: TargetOutput | null }) {
  return (
    <Card className="animate-rise p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Overall CAD</p>
        {out?.illustrative && <Badge tone="amber">Demo value</Badge>}
      </div>
      {out ? (
        <>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-display text-4xl font-semibold text-navy-900">{pct(out.probability)}</span>
            <span className="text-sm font-medium text-navy-700">{out.class_text ?? '—'}</span>
          </div>
          <ProbabilityBar p={out.probability} className="mt-3" />
        </>
      ) : <p className="mt-2 text-sm text-navy-500">No output available.</p>}
    </Card>
  )
}

export function VesselCards({ vessels, selected, onSelect }: {
  vessels: Record<VesselId, TargetOutput> | null; selected: VesselId | null; onSelect: (id: VesselId) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
      {VESSEL_IDS.map((id, i) => {
        const out = vessels?.[id] ?? null
        const active = selected === id
        return (
          <button key={id} onClick={() => onSelect(id)} aria-pressed={active} style={{ animationDelay: `${i * 70}ms` }}
            className={cx('animate-rise rounded-2xl border bg-white p-4 text-left transition-all hover:shadow-md',
              active ? 'border-navy-900 shadow-md ring-1 ring-navy-900' : 'border-line')}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-navy-900">{VESSELS[id].name}</span>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: out?.probability != null ? riskColor(out.probability) : '#cbd5e1' }} />
            </div>
            <div className="mt-1 text-2xl font-semibold text-navy-900">{pct(out?.probability)}</div>
            <div className="text-xs text-navy-500">{out?.class_text ?? 'No output'}</div>
            <ProbabilityBar p={out?.probability ?? null} className="mt-2" />
          </button>
        )
      })}
    </div>
  )
}

export function VesselDetail({ id, out, semantics }: { id: VesselId | null; out: TargetOutput | null; semantics?: string }) {
  if (!id) {
    return (
      <Card className="p-5 text-sm text-navy-500">
        Select LAD, LCX or RCA — on the heart or in the cards above — to inspect that vessel's output.
      </Card>
    )
  }
  const v = VESSELS[id]
  return (
    <Card className="animate-rise p-5" key={id} aria-live="polite">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-navy-900">{v.name} — {v.fullName}</h3>
          <p className="mt-0.5 text-[13px] text-navy-500">{v.territory}</p>
        </div>
        {out?.illustrative && <Badge tone="amber">Demo value</Badge>}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-navy-500">Output</dt><dd className="font-semibold">{pct(out?.probability)}</dd></div>
        <div><dt className="text-xs text-navy-500">Predicted class</dt><dd className="font-semibold">{out?.class_text ?? '—'}</dd></div>
      </dl>
      <p className="mt-4 rounded-lg bg-canvas p-3 text-xs leading-relaxed text-navy-500">
        {semantics} The vessel colour on the 3D heart reflects this model output only; it does not show where a lesion is, and the
        dataset contains no patient-specific 3D lesion geometry.
      </p>
    </Card>
  )
}
