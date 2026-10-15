import { useMemo } from 'react'
import type { FeatureSchema } from '../../../types/api'
import { getLabMarkers } from '../../../lib/clinical'

interface LabsVsRangeChartProps {
  inputs?: Record<string, unknown> | null
  schema?: FeatureSchema | null
  className?: string
}

export default function LabsVsRangeChart({
  inputs,
  schema,
  className = '',
}: LabsVsRangeChartProps) {
  const markers = useMemo(() => {
    return getLabMarkers(inputs, schema).slice(0, 6)
  }, [inputs, schema])

  if (markers.length === 0) {
    return (
      <div className={`flex h-[230px] flex-col items-center justify-center p-4 text-center text-ink-3 ${className}`}>
        <p className="text-xs font-medium text-ink-2">Key Labs vs Reference</p>
        <p className="mt-1 text-xs">No lab markers found in record.</p>
      </div>
    )
  }

  const ariaText = `Laboratory values vs reference ranges: ${markers
    .map(
      (m) =>
        `${m.label}: ${m.value} ${m.unit} (${m.isOutside ? 'outside standard range' : 'within standard range'})`
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
          <h4 className="text-xs font-semibold text-ink">Labs vs Reference</h4>
          <p className="text-[10px] text-ink-3">Shaded band indicates expected range</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-ink-3">
          <span className="h-2 w-3 rounded-xs bg-surface-2 border border-line" />
          <span>Ref band</span>
        </div>
      </div>

      <div className="space-y-2 my-auto py-1">
        {markers.map((m) => {
          const range = m.maxBound - m.minBound || 1

          // Calculate percentage coordinates
          const dotPct = Math.min(100, Math.max(0, ((m.value - m.minBound) / range) * 100))
          const refLowPct =
            m.refLow != null ? Math.min(100, Math.max(0, ((m.refLow - m.minBound) / range) * 100)) : 0
          const refHighPct =
            m.refHigh != null
              ? Math.min(100, Math.max(0, ((m.refHigh - m.minBound) / range) * 100))
              : 100
          const bandWidth = Math.max(4, refHighPct - refLowPct)

          return (
            <div key={m.key} className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-medium text-ink truncate max-w-[130px]">{m.label}</span>
                <span
                  className={`font-mono tabular-nums ${
                    m.isOutside ? 'font-bold text-danger' : 'text-ink-2 font-medium'
                  }`}
                >
                  {m.value} {m.unit}
                </span>
              </div>

              {/* Strip plot track */}
              <div className="relative h-2 w-full rounded-full bg-surface-2/80 overflow-visible">
                {/* Reference band */}
                <div
                  className="absolute top-0 bottom-0 bg-line/80 rounded-xs border-x border-ink-3/30"
                  style={{
                    left: `${refLowPct}%`,
                    width: `${bandWidth}%`,
                  }}
                  title={
                    m.refLow != null && m.refHigh != null
                      ? `Reference: ${m.refLow} – ${m.refHigh} ${m.unit}`
                      : 'Reference range'
                  }
                />

                {/* Patient value dot */}
                <div
                  className={`absolute -top-0.5 h-3 w-3 -ml-1.5 rounded-full z-10 transition-all duration-500 shadow-xs ${
                    m.isOutside
                      ? 'bg-danger ring-2 ring-danger-soft'
                      : 'bg-ink-2 ring-1 ring-surface'
                  }`}
                  style={{ left: `${dotPct}%` }}
                  title={`${m.label}: ${m.value} ${m.unit}`}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="pt-1 border-t border-line/60 flex justify-between items-center text-[9px] text-ink-3">
        <span>Low</span>
        <span>Red dot indicates value outside usual reference</span>
        <span>High</span>
      </div>
    </div>
  )
}