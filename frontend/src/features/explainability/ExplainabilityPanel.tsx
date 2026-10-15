import { BrainCircuit } from 'lucide-react'
import { Badge, Card, CardHeader, EmptyState } from '../../components/ui'
import type { Explanation, FeatureValue } from '../../types/api'

function fmt(v: FeatureValue, unit?: string | null) {
  if (v === null || v === undefined) return 'not provided'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return `${v}${unit ? ` ${unit}` : ''}`
}

export default function ExplainabilityPanel({ explanation, modelVersion }: { explanation: Explanation | null; modelVersion: string | null }) {
  return (
    <Card>
      <CardHeader title="Feature contributions"
        subtitle="Which measurements pushed the overall CAD output up or down"
        action={explanation && <Badge tone="blue">{explanation.method}{modelVersion ? ` · ${modelVersion}` : ''}</Badge>} />
      <div className="p-5">
        {!explanation || explanation.contributions.length === 0 ? (
          <EmptyState icon={<BrainCircuit className="h-8 w-8" />} title="No explanation available">
            The connected model did not return feature contributions. Explanations appear here once the trained pipeline
            provides them (for example SHAP values).
          </EmptyState>
        ) : (
          <>
            <Rows explanation={explanation} />
            <p className="mt-4 text-xs leading-relaxed text-navy-500">
              {explanation.note} Positive values push the output toward the positive class (CAD),
              negative values toward normal. Contributions describe how the model behaved; they do not show that a feature
              causes disease.
            </p>
          </>
        )}
      </div>
    </Card>
  )
}

function Rows({ explanation }: { explanation: Explanation }) {
  const max = Math.max(...explanation.contributions.map((c) => Math.abs(c.contribution)), 1e-9)
  return (
    <ol className="space-y-2.5">
      {explanation.contributions.map((c) => {
        const pos = c.contribution >= 0
        const w = (Math.abs(c.contribution) / max) * 50
        return (
          <li key={c.feature} className="grid grid-cols-[minmax(0,10rem)_1fr_3.5rem] items-center gap-3 text-[13px] sm:grid-cols-[minmax(0,14rem)_1fr_4rem]">
            <div className="min-w-0">
              <div className="truncate font-medium text-navy-900" title={c.label}>{c.label}</div>
              <div className="truncate text-xs text-navy-500">{fmt(c.value, c.unit)}</div>
            </div>
            <div className="relative h-5" role="img" aria-label={`${c.label}: ${pos ? 'increases' : 'decreases'} output by ${Math.abs(c.contribution).toFixed(3)}`}>
              <div className="absolute inset-y-0 left-1/2 w-px bg-navy-300" />
              <div className="absolute inset-y-0.5 rounded transition-[width] duration-700"
                style={{ width: `${w}%`, [pos ? 'left' : 'right']: '50%', background: pos ? '#d6334a' : '#2563a8' }} />
            </div>
            <div className={`text-right tabular-nums ${pos ? 'text-red-700' : 'text-blue-800'}`}>{pos ? '+' : ''}{c.contribution.toFixed(3)}</div>
          </li>
        )
      })}
    </ol>
  )
}
