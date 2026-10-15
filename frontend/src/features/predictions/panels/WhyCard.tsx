import { ArrowDownRight, ArrowUpRight, ChevronDown, Info } from 'lucide-react'
import type { Explanation, FeatureSchema } from '../../../types/api'
import { Card } from '../../../components/ui'
import { driverSentence } from '../../../lib/narrative'

interface WhyCardProps {
  explanation?: Explanation | null
  schema?: FeatureSchema | null
  onSeeAllDrivers?: () => void
  className?: string
}

export default function WhyCard({
  explanation,
  schema,
  onSeeAllDrivers,
  className = '',
}: WhyCardProps) {
  if (!explanation || !explanation.contributions || explanation.contributions.length === 0) {
    return (
      <Card className={`p-4 shadow-sm border border-line ${className}`}>
        <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5 mb-1">
          Why the model says this
        </h3>
        <p className="text-xs text-ink-3">
          Explanations are not available for this record.
        </p>
      </Card>
    )
  }

  const schemaMap = new Map(schema?.features.map((f) => [f.name, f]))

  // CAD contributions
  const cadContribs = explanation.contributions.filter((c) => (c.target || 'CAD') === 'CAD')

  // Top 3 positive (pushing toward disease)
  const topPos = cadContribs
    .filter((c) => c.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)

  // Top 2 negative (pushing toward normal)
  const topNeg = cadContribs
    .filter((c) => c.contribution < 0)
    .sort((a, b) => a.contribution - b.contribution)
    .slice(0, 2)

  return (
    <Card className={`p-4 shadow-sm border border-line space-y-3 ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-line/60">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
            Why the model says this
            <span
              className="text-ink-3 hover:text-ink cursor-help"
              title="Feature impacts derived from model occlusion testing."
            >
              <Info className="h-3.5 w-3.5" />
            </span>
          </h3>
          <p className="text-[11px] text-ink-3">Top factors influencing the overall CAD score</p>
        </div>
      </div>

      <div className="space-y-2">
        {/* Factors raising estimate */}
        {topPos.map((c) => {
          const spec = schemaMap.get(c.feature)
          const sentence = driverSentence(c, spec)
          const pts = Math.round(Math.abs(c.contribution) * 100)

          return (
            <div
              key={c.feature}
              className="flex items-start gap-2.5 rounded-xl bg-danger-soft/60 p-2 text-xs border border-danger/20"
            >
              <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-danger text-white mt-0.5 shadow-xs">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-ink leading-snug">{sentence}</p>
              </div>
              <span className="shrink-0 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold text-danger border border-danger/30 font-mono tabular-nums">
                +{pts} pts
              </span>
            </div>
          )
        })}

        {/* Factors lowering estimate */}
        {topNeg.map((c) => {
          const spec = schemaMap.get(c.feature)
          const sentence = driverSentence(c, spec)
          const pts = Math.round(Math.abs(c.contribution) * 100)

          return (
            <div
              key={c.feature}
              className="flex items-start gap-2.5 rounded-xl bg-info-soft/60 p-2 text-xs border border-info/20"
            >
              <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-info text-white mt-0.5 shadow-xs">
                <ArrowDownRight className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-ink leading-snug">{sentence}</p>
              </div>
              <span className="shrink-0 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold text-info border border-info/30 font-mono tabular-nums">
                -{pts} pts
              </span>
            </div>
          )
        })}
      </div>

      {/* Footnote per Section 6 */}
      <p className="text-[10px] text-ink-3 leading-tight pt-1">
        Impact of each value on the model&apos;s output. These are model behaviours, not causes, and they do not add up to the total.
      </p>

      {onSeeAllDrivers && (
        <button
          type="button"
          onClick={onSeeAllDrivers}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-2/70 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors"
        >
          <span>See all driver impacts</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}
    </Card>
  )
}