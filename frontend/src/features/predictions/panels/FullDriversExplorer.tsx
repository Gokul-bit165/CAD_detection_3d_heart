import { useState, useEffect } from 'react'
import { BrainCircuit, ChevronDown } from 'lucide-react'
import type { Explanation, FeatureValue, TargetId, VesselId } from '../../../types/api'
import { Badge, EmptyState } from '../../../components/ui'

interface FullDriversExplorerProps {
  explanation?: Explanation | null
  modelVersion?: string | null
  selected?: VesselId | null
  onSelectTarget?: (target: TargetId) => void
  className?: string
}

const TARGETS: { id: TargetId; label: string }[] = [
  { id: 'CAD', label: 'Overall CAD' },
  { id: 'LAD', label: 'LAD Artery' },
  { id: 'LCX', label: 'LCX Artery' },
  { id: 'RCA', label: 'RCA Artery' },
]

function fmt(v: FeatureValue, unit?: string | null) {
  if (v === null || v === undefined) return 'not provided'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return `${v}${unit ? ` ${unit}` : ''}`
}

export default function FullDriversExplorer({
  explanation,
  modelVersion,
  selected,
  onSelectTarget,
  className = '',
}: FullDriversExplorerProps) {
  const [activeTarget, setActiveTarget] = useState<TargetId>('CAD')

  // Sync active tab with selected vessel from heart scene
  useEffect(() => {
    if (selected) {
      setActiveTarget(selected)
    }
  }, [selected])

  const handleTabClick = (t: TargetId) => {
    setActiveTarget(t)
    onSelectTarget?.(t)
  }

  const contributions = (explanation?.contributions ?? []).filter(
    (c) => (c.target || 'CAD') === activeTarget
  )

  const max = Math.max(0.01, ...contributions.map((c) => Math.abs(c.contribution)))

  return (
    <details
      id="full-drivers-explorer"
      open
      className={`group rounded-2xl border border-line bg-surface p-5 shadow-sm transition-all duration-200 ${className}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink">
        <div className="flex items-center gap-2.5">
          <BrainCircuit className="h-4 w-4 text-accent" />
          <span>Full Drivers Explorer — All Feature Impacts</span>
          {explanation && (
            <Badge tone="blue">
              {explanation.method}
              {modelVersion ? ` • ${modelVersion}` : ''}
            </Badge>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-ink-3 transition-transform group-open:rotate-180" />
      </summary>

      <div className="mt-4 pt-4 border-t border-line/60">
        {/* Target Tabs */}
        <div className="flex flex-wrap gap-2 pb-4 border-b border-line/60">
          {TARGETS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabClick(t.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTarget === t.id
                  ? 'bg-ink text-surface shadow-xs'
                  : 'bg-surface-2 text-ink-2 hover:bg-surface-2/80 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {!explanation || contributions.length === 0 ? (
          <div className="py-8">
            <EmptyState icon={<BrainCircuit className="h-8 w-8 text-ink-3" />} title="No explanation available">
              The model did not return feature contributions for {activeTarget}.
            </EmptyState>
          </div>
        ) : (
          <div className="pt-4 space-y-3">
            <ol className="space-y-2">
              {contributions.map((c) => {
                const pos = c.contribution >= 0
                const w = (Math.abs(c.contribution) / max) * 50
                const pts = Math.round(Math.abs(c.contribution) * 100)

                return (
                  <li
                    key={`${c.target}-${c.feature}`}
                    className="grid grid-cols-[minmax(0,10rem)_1fr_4rem] items-center gap-3 text-[13px] sm:grid-cols-[minmax(0,14rem)_1fr_4.5rem] py-1 border-b border-line/40"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink" title={c.label}>
                        {c.label}
                      </div>
                      <div className="truncate text-xs text-ink-3">{fmt(c.value, c.unit)}</div>
                    </div>

                    <div className="relative flex h-4 w-full items-center bg-surface-2 rounded-xs overflow-hidden">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-line z-10" />
                      {pos ? (
                        <div
                          className="h-full bg-danger/80 rounded-r-xs transition-all duration-300"
                          style={{
                            marginLeft: '50%',
                            width: `${w}%`,
                          }}
                        />
                      ) : (
                        <div
                          className="h-full bg-info/80 rounded-l-xs transition-all duration-300"
                          style={{
                            marginLeft: `${Math.max(0, 50 - w)}%`,
                            width: `${w}%`,
                          }}
                        />
                      )}
                    </div>

                    <div
                      className={`text-right font-mono text-xs font-semibold tabular-nums ${
                        pos ? 'text-danger' : 'text-info'
                      }`}
                    >
                      {pos ? `+${pts}` : `-${pts}`} pts
                    </div>
                  </li>
                )
              })}
            </ol>

            <p className="pt-2 text-xs leading-relaxed text-ink-3">
              {explanation.note || 'Impact of each value on the model output.'} Positive values push
              the output toward stenosis / CAD, negative values toward normal. Contributions
              describe model behaviour, not biological causes.
            </p>
          </div>
        )}
      </div>
    </details>
  )
}