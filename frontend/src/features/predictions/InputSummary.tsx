import { Card, CardHeader } from '../../components/ui'
import { useAppData } from '../../app/AppData'
import type { FeatureSpec, FeatureValue } from '../../types/api'

export function displayValue(spec: FeatureSpec, v: FeatureValue): string {
  if (v === null || v === undefined || v === '') return '—'
  if (spec.kind === 'binary') return v === true || v === 'true' ? 'Yes' : 'No'
  if (spec.options) return spec.options.find((o) => String(o.value) === String(v))?.label ?? String(v)
  return `${v}${spec.unit ? ` ${spec.unit}` : ''}`
}

export default function InputSummary({ inputs }: { inputs: Record<string, FeatureValue> | null }) {
  const { schema } = useAppData()
  if (!inputs || !schema) return null
  return (
    <Card>
      <CardHeader title="Input measurements" subtitle="Values submitted for this assessment" />
      <div className="space-y-5 p-5">
        {Object.entries(schema.groups).map(([g, label]) => {
          const specs = schema.features.filter((f) => f.group === g && inputs[f.name] != null)
          if (!specs.length) return null
          return (
            <section key={g}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-500">{label}</h3>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2 xl:grid-cols-3">
                {specs.map((f) => (
                  <div key={f.name} className="flex justify-between gap-3 border-b border-line/70 py-1">
                    <dt className="text-navy-500">{f.label}</dt>
                    <dd className="text-right font-medium text-navy-900">{displayValue(f, inputs[f.name])}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )
        })}
      </div>
    </Card>
  )
}
