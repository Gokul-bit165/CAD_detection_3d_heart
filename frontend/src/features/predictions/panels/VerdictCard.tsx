import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { TargetOutput } from '../../../types/api'
import { Badge, Card } from '../../../components/ui'
import { CountUp } from '../../../components/motion'
import { pct, riskColor } from '../../../lib/risk'
import { verdictSentence } from '../../../lib/narrative'

interface VerdictCardProps {
  overall?: TargetOutput | null
  className?: string
}

export default function VerdictCard({ overall, className = '' }: VerdictCardProps) {
  if (!overall) {
    return (
      <Card className={`p-5 ${className}`}>
        <p className="text-sm text-ink-3">No overall verdict available.</p>
      </Card>
    )
  }

  const prob = overall.probability ?? 0
  const thr = overall.threshold ?? 0.42
  const isFlagged = overall.predicted_class === 'positive' || prob >= thr
  const color = riskColor(prob)
  const { headline, subtext } = verdictSentence(overall)

  // SVG Gauge calculations
  // Semi-circle or 240-deg arc
  const radius = 42
  const circumference = 2 * Math.PI * radius
  // We'll use a circular ring gauge
  const strokeDashoffset = circumference - prob * circumference
  // Angle for threshold tick (start from top: -90deg)
  const thrAngle = thr * 360 - 90
  const thrRad = (thrAngle * Math.PI) / 180
  const cx = 54
  const cy = 54
  const tickX1 = cx + (radius - 5) * Math.cos(thrRad)
  const tickY1 = cy + (radius - 5) * Math.sin(thrRad)
  const tickX2 = cx + (radius + 5) * Math.cos(thrRad)
  const tickY2 = cy + (radius + 5) * Math.sin(thrRad)

  return (
    <Card className={`p-4 shadow-sm border border-line ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-line/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">
            Primary Verdict
          </span>
          <Badge tone={isFlagged ? 'red' : 'teal'}>
            {isFlagged ? 'Probable CAD' : 'Low CAD Risk'}
          </Badge>
        </div>
        {overall.reliability && (
          <Badge tone={overall.reliability === 'good' ? 'teal' : 'amber'}>
            {overall.reliability} reliability
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-4 py-3">
        {/* SVG Radial Gauge */}
        <div className={`relative shrink-0 ${isFlagged ? 'pulse-ring-danger rounded-full' : ''}`}>
          <svg className="h-[108px] w-[108px] -rotate-90 transform" viewBox="0 0 108 108">
            {/* Background track */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              stroke="var(--line)"
              strokeWidth="9"
              fill="transparent"
            />
            {/* Animated filled arc */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              stroke={color}
              strokeWidth="9"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-900 ease-out"
            />
            {/* Threshold tick mark */}
            <line
              x1={tickX1}
              y1={tickY1}
              x2={tickX2}
              y2={tickY2}
              stroke="var(--ink)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>

          {/* Centered text in ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold tracking-tight text-ink">
              <CountUp value={prob * 100} />
            </span>
            <span className="text-[10px] text-ink-3 font-medium -mt-1">probability</span>
          </div>
        </div>

        {/* Headline + threshold info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold mb-1">
            {isFlagged ? (
              <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-ok shrink-0" />
            )}
            <span className={isFlagged ? 'text-danger' : 'text-ok'}>
              {isFlagged ? 'Flagged by Model' : 'Not Flagged'}
            </span>
          </div>
          <p className="text-sm font-semibold text-ink leading-snug">{headline}</p>
          <p className="mt-1 text-[11px] text-ink-3 font-mono">
            Model threshold: <span className="font-semibold text-ink">{pct(thr)}</span>
          </p>
        </div>
      </div>

      {/* Safety subtext per Section 6 */}
      <div className="rounded-xl bg-surface-2/60 p-2.5 text-xs leading-relaxed text-ink-2 border border-line/60">
        {subtext}
      </div>
    </Card>
  )
}