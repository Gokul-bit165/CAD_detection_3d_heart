import { useMemo } from 'react'
import { Info } from 'lucide-react'
import type { Explanation, TargetId } from '../../../types/api'

interface DriversChartProps {
  explanation?: Explanation | null
  target?: TargetId
  className?: string
}

export default function DriversChart({ explanation, target = 'CAD', className = '' }: DriversChartProps) {
  const contributions = useMemo(() => {
    if (!explanation?.contributions) return []
    return explanation.contributions
      .filter((c) => (c.target || 'CAD') === target)
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 8)
  }, [explanation, target])

  if (!explanation || contributions.length === 0) {
    return (
      <div className={`flex min-h-[260px] h-full flex-col items-center justify-center p-4 text-center text-ink-3 ${className}`}>
        <p className="text-xs font-medium text-ink-2">Impact Drivers</p>
        <p className="mt-1 text-xs">Explanations are not available for this record.</p>
      </div>
    )
  }

  // Max absolute contribution for scaling
  const maxAbs = Math.max(0.01, ...contributions.map((c) => Math.abs(c.contribution)))

  const ariaText = `Top drivers for ${target}: ${contributions
    .map(
      (c) =>
        `${c.label || c.feature}: ${c.contribution > 0 ? '+' : ''}${Math.round(c.contribution * 100)} pts`
    )
    .join(', ')}`

  return (
    <div
      role="img"
      aria-label={ariaText}
      className={`flex flex-col justify-between p-4 min-h-[260px] h-full ${className}`}
    >
      <div className="flex items-center justify-between pb-1 border-b border-line/60">
        <div>
          <h4 className="text-xs font-semibold text-ink flex items-center gap-1.5">
            Key Drivers ({target})
            <span
              className="text-ink-3 hover:text-ink cursor-help"
              title="Points of probability shifted by each input value relative to typical reference."
            >
              <Info className="h-3 w-3" />
            </span>
          </h4>
          <p className="text-[10px] text-ink-3">Impact on model estimate</p>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1 text-info font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-info" /> Lower
          </span>
          <span className="flex items-center gap-1 text-danger font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-danger" /> Raise
          </span>
        </div>
      </div>

      <div className="space-y-1.5 overflow-hidden py-1 my-auto">
        {contributions.map((c, i) => {
          const pts = Math.round(c.contribution * 100)
          const absPts = Math.abs(pts)
          const pctWidth = Math.min(100, (Math.abs(c.contribution) / maxAbs) * 100)
          const isPositive = c.contribution > 0
          const displayVal = c.unit ? `${c.value} ${c.unit}` : `${c.value}`

          return (
            <div
              key={`${c.feature}-${i}`}
              className="group grid grid-cols-[100px_1fr_40px] items-center gap-2 text-[11px]"
              title={`If this were typical, the estimate would be ${absPts} pts ${isPositive ? 'lower' : 'higher'}`}
            >
              <div className="truncate text-ink-2 font-medium" title={`${c.label || c.feature}: ${displayVal}`}>
                {c.label || c.feature}
              </div>

              {/* Diverging bar track */}
              <div className="relative flex h-3 w-full items-center bg-surface-2 rounded-xs overflow-hidden">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-line z-10" />
                {isPositive ? (
                  <div
                    className="h-full bg-danger/85 rounded-r-xs transition-all duration-500 ease-out"
                    style={{
                      marginLeft: '50%',
                      width: `${pctWidth / 2}%`,
                    }}
                  />
                ) : (
                  <div
                    className="h-full bg-info/85 rounded-l-xs transition-all duration-500 ease-out"
                    style={{
                      marginRight: '50%',
                      marginLeft: `${Math.max(0, 50 - pctWidth / 2)}%`,
                      width: `${pctWidth / 2}%`,
                    }}
                  />
                )}
              </div>

              <div
                className={`text-right font-mono font-medium tabular-nums ${
                  isPositive ? 'text-danger' : 'text-info'
                }`}
              >
                {isPositive ? `+${absPts}` : `-${absPts}`}
              </div>
            </div>
          )
        })}
      </div>

      <div className="pt-1 border-t border-line/60 flex justify-between items-center text-[9px] text-ink-3">
        <span>- Toward normal</span>
        <span className="font-medium">Points of probability</span>
        <span>Toward disease +</span>
      </div>
    </div>
  )
}