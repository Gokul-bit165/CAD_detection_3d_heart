import { useId } from 'react'
import { cx } from '../../components/ui'
import type { FeatureSpec, FeatureValue } from '../../types/api'
import type { FieldIssue } from './validation'

interface Props {
  spec: FeatureSpec
  value: FeatureValue | undefined
  issue: FieldIssue | null
  touched: boolean
  readOnlyValue?: string
  onChange: (v: FeatureValue) => void
  onBlur: () => void
}

export default function FieldControl({ spec, value, issue, touched, readOnlyValue, onChange, onBlur }: Props) {
  const id = useId()
  const hint = [spec.ref_range && `Ref ${spec.ref_range}`, spec.note].filter(Boolean).join(' · ')
  const showIssue = issue && (touched || issue.level === 'warning') && (issue.level === 'warning' ? value !== '' : true)
  const opts = spec.options ?? []
  const segmented = (spec.kind !== 'number') && opts.every((o) => o.label.length <= 14) && opts.length <= 5

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-baseline gap-1.5 text-[13px] font-medium text-navy-900">
        {spec.label}
        {spec.unit && <span className="font-normal text-navy-500">({spec.unit})</span>}
        <span className={cx('ml-auto text-[11px] font-normal', spec.required ? 'text-teal-800' : 'text-navy-300')}>{spec.derived ? 'Calculated' : spec.required ? 'Required' : 'Optional'}</span>
      </label>

      {spec.derived ? (
        <div id={id} className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-navy-700">{readOnlyValue ?? 'Calculated from weight and height'}</div>
      ) : spec.kind === 'number' ? (
        <input id={id} type="number" inputMode="decimal" step={spec.step ?? 'any'} value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)} onBlur={onBlur} aria-invalid={issue?.level === 'error' && touched}
          aria-describedby={`${id}-d`}
          className={cx('w-full rounded-lg border bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-navy-300',
            issue?.level === 'error' && touched ? 'border-red-400' : 'border-line')}
          placeholder={spec.observed_min != null ? `e.g. ${Math.round(((spec.observed_min + spec.observed_max!) / 2) * 10) / 10}` : undefined} />
      ) : segmented ? (
        <div role="radiogroup" aria-labelledby={id} id={id} aria-describedby={`${id}-d`} className="flex flex-wrap gap-1.5">
          {opts.map((o) => {
            const on = String(value) === String(o.value)
            return (
              <button key={String(o.value)} type="button" role="radio" aria-checked={on}
                onClick={() => { onChange(spec.kind === 'binary' ? o.value === 'true' : o.value); onBlur() }}
                className={cx('rounded-lg border px-3 py-1.5 text-sm transition-colors',
                  on ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-white text-navy-700 hover:bg-canvas')}>
                {o.label}
              </button>
            )
          })}
        </div>
      ) : (
        <select id={id} value={String(value ?? '')} onChange={(e) => { const o = opts.find((x) => String(x.value) === e.target.value); onChange(o ? o.value : e.target.value) }}
          onBlur={onBlur} aria-describedby={`${id}-d`} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm">
          {opts.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </select>
      )}

      <p id={`${id}-d`} className="min-h-[1rem] text-xs leading-snug">
        {showIssue
          ? <span className={issue!.level === 'error' ? 'text-red-700' : 'text-amber-800'}>{issue!.message}</span>
          : <span className="text-navy-500">{hint || spec.description}</span>}
      </p>
    </div>
  )
}
