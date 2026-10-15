import { useEffect, useState } from 'react'
import { riskColor, pct } from '../../lib/risk'
import { Badge, Card, cx } from '../../components/ui'
import type { TargetOutput, VesselId } from '../../types/api'
import { VESSELS, VESSEL_IDS } from '../heart-3d/vesselConfig'

const RELIABILITY = {
  good: { tone: 'teal', label: 'Reliable' },
  moderate: { tone: 'amber', label: 'Moderate confidence' },
  low: { tone: 'red', label: 'Low confidence' },
} as const

export function ReliabilityBadge({ level }: { level?: TargetOutput['reliability'] }) {
  if (!level) return null
  const r = RELIABILITY[level]
  return <Badge tone={r.tone}>{r.label}</Badge>
}

const LOW_NOTE =
  'This vessel model is only weakly better than chance on held-out patients (AUC about 0.65–0.75). Treat the output as a screening hint, not a confirmed finding.'

export function ProbabilityBar({ p, className }: { p: number | null; className?: string }) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const t = requestAnimationFrame(() => setW(p ?? 0))
    return () => cancelAnimationFrame(t)
  }, [p])
  return (
    <div
      className={cx('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={p == null ? undefined : Math.round(p * 100)}
      aria-label="Probability"
    >
      {p != null && (
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${w * 100}%`, background: riskColor(p) }}
        />
      )}
    </div>
  )
}

export function OverallCard({ out }: { out: TargetOutput | null }) {
  return (
    <Card className="animate-rise p-5 border border-line">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Overall CAD</p>
      </div>
      {out ? (
        <>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-ink font-mono">{pct(out.probability)}</span>
            <Badge tone={out.predicted_class === 'positive' ? 'red' : 'teal'}>{out.class_text}</Badge>
          </div>
          <ProbabilityBar p={out.probability} className="mt-3" />
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-3">No overall output returned.</p>
      )}
    </Card>
  )
}

export function VesselCards({
  vessels,
  selected,
  onSelect,
}: {
  vessels?: Record<VesselId, TargetOutput>
  selected: VesselId | null
  onSelect: (id: VesselId) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
      {VESSEL_IDS.map((id, i) => {
        const out = vessels?.[id] ?? null
        const active = selected === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={active}
            style={{ animationDelay: `${i * 70}ms` }}
            className={cx(
              'animate-rise rounded-2xl border bg-surface p-4 text-left transition-all hover:shadow-md cursor-pointer',
              active ? 'border-accent shadow-md ring-2 ring-accent' : 'border-line'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">{VESSELS[id].name}</span>
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: out?.probability != null ? riskColor(out.probability) : 'var(--line)',
                }}
              />
            </div>
            <div className="mt-1 text-2xl font-semibold text-ink font-mono">{pct(out?.probability)}</div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
              <span>{out?.class_text ?? 'No output'}</span>
              <ReliabilityBadge level={out?.reliability} />
            </div>
            <ProbabilityBar p={out?.probability ?? null} className="mt-2" />
          </button>
        )
      })}
    </div>
  )
}

export function VesselDetail({
  id,
  out,
  semantics,
}: {
  id: VesselId | null
  out: TargetOutput | null
  semantics?: string
}) {
  if (!id) {
    return (
      <Card className="p-5 text-sm text-ink-3 border border-line">
        Select LAD, LCX or RCA — on the heart or in the cards above — to inspect that vessel&apos;s output.
      </Card>
    )
  }
  const v = VESSELS[id]
  return (
    <Card className="animate-rise p-5 border border-line" key={id} aria-live="polite">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-ink">
            {v.name} — {v.fullName}
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-3">{v.territory}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-surface-2 p-2.5">
          <dt className="text-xs text-ink-3 font-medium">Output</dt>
          <dd className="font-semibold text-ink font-mono mt-0.5">{pct(out?.probability)}</dd>
        </div>
        <div className="rounded-xl bg-surface-2 p-2.5">
          <dt className="text-xs text-ink-3 font-medium">Predicted class</dt>
          <dd className="font-semibold text-ink mt-0.5">{out?.class_text ?? '—'}</dd>
        </div>
        {out?.threshold != null && (
          <div className="rounded-xl bg-surface-2 p-2.5">
            <dt className="text-xs text-ink-3 font-medium">Decision threshold</dt>
            <dd className="font-semibold text-ink font-mono mt-0.5">{pct(out.threshold)}</dd>
          </div>
        )}
        {out?.reliability && (
          <div className="rounded-xl bg-surface-2 p-2.5">
            <dt className="text-xs text-ink-3 font-medium">Model reliability</dt>
            <dd className="mt-0.5">
              <ReliabilityBadge level={out.reliability} />
            </dd>
          </div>
        )}
      </dl>
      {out?.reliability === 'low' && (
        <p className="mt-3 rounded-lg border border-warn/30 bg-warn-soft p-3 text-xs leading-relaxed text-ink">
          {LOW_NOTE}
        </p>
      )}
      <p className="mt-4 rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-ink-3">
        {semantics} The vessel colour on the 3D heart reflects this model output only; it does not show where a lesion is, and the
        dataset contains no patient-specific 3D lesion geometry.
      </p>
    </Card>
  )
}