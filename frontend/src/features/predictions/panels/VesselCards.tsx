import { HelpCircle } from 'lucide-react'
import type { TargetOutput, VesselFinding, VesselId } from '../../../types/api'
import { Badge, Card, cx } from '../../../components/ui'
import { pct, riskColor } from '../../../lib/risk'
import { VESSELS, VESSEL_IDS } from '../../heart-3d/vesselConfig'

const LOW_NOTE =
  'This vessel model is only weakly better than chance on held-out patients (AUC about 0.65â€“0.75). Treat the output as a screening hint, not a confirmed stenosis.'

interface VesselCardsProps {
  vessels?: Record<VesselId, TargetOutput> | null
  findings?: VesselFinding[] | null
  selected?: VesselId | null
  tourVessel?: VesselId | null
  onSelect?: (vessel: VesselId | null) => void
  className?: string
}

export default function VesselCards({
  vessels,
  findings,
  selected,
  tourVessel,
  onSelect,
  className = '',
}: VesselCardsProps) {
  if (!vessels) {
    return (
      <Card className={`p-4 ${className}`}>
        <p className="text-xs text-ink-3">Artery predictions not available.</p>
      </Card>
    )
  }

  const findingsMap = new Map(findings?.map((f) => [f.vessel, f]))

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3">
          Coronary Arteries (3)
        </h3>
        <span className="text-[11px] text-ink-3">Click to inspect in 3D</span>
      </div>

      <div className="space-y-2">
        {VESSEL_IDS.map((id) => {
          const out = vessels[id]
          const finding = findingsMap.get(id)
          const info = VESSELS[id]

          const prob = out?.probability ?? 0
          const thr = out?.threshold ?? 0.4
          const isStenotic = finding
            ? finding.status === 'stenotic'
            : out?.predicted_class === 'positive' || prob >= thr

          const reliability = finding?.reliability ?? out?.reliability ?? null
          const isSelected = selected === id
          const isTourActive = tourVessel === id
          const isHighlighted = isSelected || isTourActive
          const color = riskColor(prob)
          const thrPct = Math.round(thr * 100)
          const probPct = Math.min(100, Math.max(0, Math.round(prob * 100)))

          return (
            <Card
              key={id}
              onClick={() => onSelect?.(isSelected ? null : id)}
              className={cx(
                'cursor-pointer p-3 transition-all duration-200 border text-left',
                isHighlighted
                  ? 'border-accent bg-accent-soft/20 ring-2 ring-accent glow-accent shadow-sm'
                  : 'border-line hover:border-ink-3/40 hover:bg-surface-2/40'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-ink">{info.name}</span>
                    <span className="text-xs text-ink-3 font-normal truncate max-w-[140px]">
                      {info.fullName}
                    </span>
                  </div>
                  <p className="text-[10px] text-ink-3 line-clamp-1 mt-0.5">{info.territory}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {reliability === 'low' && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-medium text-warn border border-warn/25 cursor-help"
                      title={LOW_NOTE}
                    >
                      <HelpCircle className="h-3 w-3" /> low conf
                    </span>
                  )}

                  <Badge tone={isStenotic ? 'red' : 'neutral'}>
                    {isStenotic ? 'Flagged' : 'Not flagged'}
                  </Badge>
                </div>
              </div>

              {/* Score bar with threshold tick */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-ink font-semibold">{pct(prob)} probability</span>
                  <span className="text-[10px] text-ink-3">Cut-off {thrPct}%</span>
                </div>

                <div className="relative h-2 w-full rounded-full bg-surface-2 overflow-visible">
                  {/* Filled probability */}
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${probPct}%`,
                      backgroundColor: color,
                    }}
                  />
                  {/* Threshold mark */}
                  <div
                    className="absolute -top-1 bottom-[-4px] w-1 bg-ink rounded-full z-10 shadow-xs"
                    style={{ left: `calc(${thrPct}% - 2px)` }}
                    title={`Decision threshold: ${thrPct}%`}
                  />
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}