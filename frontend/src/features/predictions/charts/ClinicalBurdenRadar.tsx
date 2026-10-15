import { useMemo } from 'react'
import { Info } from 'lucide-react'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import type { FeatureSchema } from '../../../types/api'
import { calculateClinicalBurden } from '../../../lib/clinical'

interface ClinicalBurdenRadarProps {
  inputs?: Record<string, unknown> | null
  schema?: FeatureSchema | null
  className?: string
}

export default function ClinicalBurdenRadar({
  inputs,
  schema,
  className = '',
}: ClinicalBurdenRadarProps) {
  const data = useMemo(() => {
    return calculateClinicalBurden(inputs, schema)
  }, [inputs, schema])

  if (!inputs) {
    return (
      <div className={`flex min-h-[260px] h-full flex-col items-center justify-center p-4 text-center text-ink-3 ${className}`}>
        <p className="text-xs font-medium text-ink-2">Clinical Profile</p>
        <p className="mt-1 text-xs">Patient inputs not available.</p>
      </div>
    )
  }

  const ariaText = `Clinical burden profile: ${data.map((d) => `${d.subject}: ${d.value}%`).join(', ')}`

  return (
    <div
      role="img"
      aria-label={ariaText}
      className={`flex flex-col justify-between p-4 min-h-[260px] h-full ${className}`}
    >
      <div className="flex items-center justify-between pb-1 border-b border-line/60">
        <div>
          <h4 className="text-xs font-semibold text-ink flex items-center gap-1.5">
            Clinical Burden Profile
            <span
              className="text-ink-3 hover:text-ink cursor-help"
              title="A descriptive summary of input domain burden (0–100), not a model output."
            >
              <Info className="h-3 w-3" />
            </span>
          </h4>
          <p className="text-[10px] text-ink-3">Descriptive summary of input domains</p>
        </div>
      </div>

      <div className="relative w-full h-[155px] my-auto">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="var(--line)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: 'var(--ink-2)', fontSize: 9, fontWeight: 500 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              stroke="transparent"
              tick={false}
            />
            <Radar
              name="Burden"
              dataKey="value"
              stroke="var(--accent)"
              strokeWidth={1.5}
              fill="var(--accent)"
              fillOpacity={0.25}
              isAnimationActive={true}
              animationDuration={800}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-1 border-t border-line/60 flex justify-between items-center text-[9px] text-ink-3">
        <span>0% (no findings)</span>
        <span>Center = low / Outer = high burden</span>
        <span>100%</span>
      </div>
    </div>
  )
}