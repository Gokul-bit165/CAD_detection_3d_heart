import { ChevronDown, FileText } from 'lucide-react'
import { useAppData } from '../../app/AppData'
import type { FeatureSpec, FeatureValue } from '../../types/api'

export function displayValue(spec: FeatureSpec, v: FeatureValue): string {
  if (v === null || v === undefined || v === '') return '—'
  if (spec.kind === 'binary') return v === true || v === 'true' ? 'Yes' : 'No'
  if (spec.options) return spec.options.find((o) => String(o.value) === String(v))?.label ?? String(v)
  return `${v}${spec.unit ? ` ${spec.unit}` : ''}`
}

export default function InputSummary({
  inputs,
  className = '',
}: {
  inputs: Record<string, FeatureValue> | null | undefined
  className?: string
}) {
  const { schema } = useAppData()
  if (!inputs || !schema) return null

  return (
    <details
      open
      className={`group rounded-2xl border border-line bg-surface p-5 shadow-sm transition-all duration-200 ${className}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink">
        <div className="flex items-center gap-2.5">
          <FileText className="h-4 w-4 text-accent" />
          <span>Input Measurements — Full Clinical Submission</span>
        </div>
        <ChevronDown className="h-4 w-4 text-ink-3 transition-transform group-open:rotate-180" />
      </summary>

      <div className="mt-4 pt-4 border-t border-line/60 space-y-6">
        {Object.entries(schema.groups).map(([g, label]) => {
          const specs = schema.features.filter((f) => f.group === g && inputs[f.name] != null)
          if (!specs.length) return null
          return (
            <section key={g}>
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-3">
                {label}
              </h3>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {specs.map((f) => (
                  <div
                    key={f.name}
                    className="flex justify-between gap-3 border-b border-line/50 py-1"
                  >
                    <dt className="text-ink-2 truncate max-w-[160px]" title={f.label}>
                      {f.label}
                    </dt>
                    <dd className="text-right font-medium text-ink tabular-nums">
                      {displayValue(f, inputs[f.name])}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )
        })}
      </div>
    </details>
  )
}