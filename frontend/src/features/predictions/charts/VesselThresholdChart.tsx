import { useMemo } from 'react'
import type { TargetOutput, VesselFinding, VesselId } from '../../../types/api'
import { pct, riskColor } from '../../../lib/risk'

interface VesselThresholdChartProps {
  overall?: TargetOutput | null
  vessels?: Record<VesselId, TargetOutput> | null
  findings?: VesselFinding[] | null
  selected?: VesselId | null
  onSelect?: (vessel: VesselId | null) => void
  className?: string
}

interface RowItem {
  id: string
  label: string
  prob: number
  threshold: number
  isStenotic: boolean
  reliability: string | null
  vesselKey: VesselId | null
  rank: number
}

export default function VesselThresholdChart({
  overall,
  vessels,
  findings,
  selected,
  onSelect,
  className = '',
}: VesselThresholdChartProps) {
  const rows = useMemo<RowItem[]>(() => {
    const list: RowItem[] = []

    // 1. Overall CAD is always first
    if (overall) {
      const prob = overall.probability ?? 0
      const thr = overall.threshold ?? 0.5
      list.push({
        id: 'CAD',
        label: 'Overall CAD',
        prob,
        threshold: thr,
        isStenotic: prob >= thr,
        reliability: overall.reliability ?? null,
        vesselKey: null,
        rank: 0,
      })
    }

    // 2. Arteries ordered by findings rank if available, otherwise LAD, LCX, RCA
    const vesselKeys: VesselId[] = ['LAD', 'LCX', 'RCA']
    if (findings && findings.length > 0) {
      // Sort copy of findings by rank
      const sortedFindings = [...findings].sort((a, b) => a.rank - b.rank)
      for (const f of sortedFindings) {
        list.push({
          id: f.vessel,
          label: `${f.vessel} Artery`,
          prob: f.probability,
          threshold: f.threshold,
          isStenotic: f.status === 'stenotic' || f.probability >= f.threshold,
          reliability: f.reliability,
          vesselKey: f.vessel,
          rank: f.rank,
        })
      }
    } else if (vessels) {
      for (const k of vesselKeys) {
        const out = vessels[k]
        if (out) {
          const prob = out.probability ?? 0
          const thr = out.threshold ?? 0.4
          list.push({
            id: k,
            label: `${k} Artery`,
            prob,
            threshold: thr,
            isStenotic: prob >= thr,
            reliability: out.reliability ?? null,
            vesselKey: k,
            rank: 99,
          })
        }
      }
    }

    return list
  }, [overall, vessels, findings])

  if (rows.length === 0) {
    return (
      <div className={`flex h-[230px] flex-col items-center justify-center p-4 text-center text-ink-3 ${className}`}>
        <p className="text-xs font-medium text-ink-2">Threshold Tracking</p>
        <p className="mt-1 text-xs">Target estimates not available for this record.</p>
      </div>
    )
  }

  const ariaText = `Threshold comparisons: ${rows
    .map(
      (r) =>
        `${r.label}: ${pct(r.prob)} (threshold ${pct(r.threshold)}), ${
          r.isStenotic ? 'flagged' : 'normal'
        }`
    )
    .join('; ')}`

  return (
    <div
      role="img"
      aria-label={ariaText}
      className={`flex flex-col justify-between p-3.5 h-[230px] ${className}`}
    >
      <div className="flex items-center justify-between pb-1 border-b border-line/60">
        <div>
          <h4 className="text-xs font-semibold text-ink">Threshold Comparison</h4>
          <p className="text-[10px] text-ink-3">Estimated score vs model cut-off</p>
        </div>
        <div className="text-[10px] text-ink-3">
          <span className="inline-block w-2.5 h-0.5 bg-ink align-middle mr-1" />
          <span>Cut-off tick</span>
        </div>
      </div>

      <div className="space-y-2.5 my-auto py-1">
        {rows.map((row) => {
          const isSelected = row.vesselKey && selected === row.vesselKey
          const thrPct = Math.round(row.threshold * 100)
          const probPct = Math.min(100, Math.max(0, Math.round(row.prob * 100)))
          const color = riskColor(row.prob)

          return (
            <div
              key={row.id}
              onClick={() => row.vesselKey && onSelect?.(row.vesselKey)}
              className={`group rounded-lg p-1 transition-colors ${
                row.vesselKey ? 'cursor-pointer hover:bg-surface-2' : ''
              } ${isSelected ? 'bg-accent-soft/40 ring-1 ring-accent' : ''}`}
            >
              <div className="flex items-center justify-between text-[11px] mb-1">
                <div className="flex items-center gap-1.5 font-medium text-ink">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      row.isStenotic ? 'bg-danger animate-pulse' : 'bg-ok'
                    }`}
                  />
                  <span>{row.label}</span>
                  {row.reliability === 'low' && (
                    <span className="text-[9px] text-warn bg-warn-soft px-1 rounded font-medium">
                      low conf
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-ink font-semibold">{pct(row.prob)}</span>
                  <span className="text-ink-3 text-[10px]">thr {thrPct}%</span>
                </div>
              </div>

              {/* Bullet track */}
              <div className="relative h-2 w-full rounded-full bg-surface-2 overflow-visible">
                {/* Filled bar */}
                <div
                  className="h-full rounded-full transition-all duration-600 ease-out"
                  style={{
                    width: `${probPct}%`,
                    backgroundColor: color,
                  }}
                />

                {/* Threshold vertical tick */}
                <div
                  className="absolute -top-1 bottom-[-4px] w-1 bg-ink rounded-full z-10 shadow-xs"
                  style={{ left: `calc(${thrPct}% - 2px)` }}
                  title={`Tuned threshold cut-off: ${thrPct}%`}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="pt-1 border-t border-line/60 flex justify-between items-center text-[9px] text-ink-3">
        <span>0%</span>
        <span>Bars exceeding vertical tick are flagged</span>
        <span>100%</span>
      </div>
    </div>
  )
}