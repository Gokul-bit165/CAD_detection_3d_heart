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

export default function FieldControl({
  spec,
  value,
  issue,
  touched,
  readOnlyValue,
  onChange,
  onBlur,
}: Props) {
  const id = useId()
  const hint = [spec.ref_range && `Ref ${spec.ref_range}`, spec.note].filter(Boolean).join(' • ')
  const showIssue =
    issue &&
    (touched || issue.level === 'warning') &&
    (issue.level === 'warning' ? value !== '' : true)
  const opts = spec.options ?? []
  const segmented =
    spec.kind !== 'number' && opts.every((o) => o.label.length <= 14) && opts.length <= 5

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-baseline gap-1.5 text-[13px] font-medium text-ink">
        {spec.label}
        {spec.unit && <span className="font-normal text-ink-3">({spec.unit})</span>}
        <span
          className={cx(
            'ml-auto text-[11px] font-normal',
            spec.required ? 'text-accent font-medium' : 'text-ink-3'
          )}
        >
          {spec.derived ? 'Calculated' : spec.required ? 'Required' : 'Optional'}
        </span>
      </label>

      {spec.derived ? (
        <div
          id={id}
          className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink-2"
        >
          {readOnlyValue ?? 'Calculated from weight and height'}
        </div>
      ) : spec.kind === 'number' ? (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={spec.step ?? 'any'}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={issue?.level === 'error' && touched}
          aria-describedby={`${id}-d`}
          className={cx(
            'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 focus:ring-accent',
            issue?.level === 'error' && touched ? 'border-danger' : 'border-line'
          )}
          placeholder={
            spec.observed_min != null
              ? `e.g. ${Math.round(((spec.observed_min + spec.observed_max!) / 2) * 10) / 10}`
              : undefined
          }
        />
      ) : segmented ? (
        <div
          role="radiogroup"
          aria-labelledby={id}
          id={id}
          aria-describedby={`${id}-d`}
          className="flex flex-wrap gap-1.5"
        >
          {opts.map((o) => {
            const on = String(value) === String(o.value)
            return (
              <button
                key={String(o.value)}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  onChange(spec.kind === 'binary' ? o.value === 'true' : o.value)
                  onBlur()
                }}
                className={cx(
                  'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                  on
                    ? 'border-ink bg-ink text-surface shadow-xs'
                    : 'border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink'
                )}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      ) : (
        <select
          id={id}
          value={String(value ?? '')}
          onChange={(e) => {
            const o = opts.find((x) => String(x.value) === e.target.value)
            onChange(o ? o.value : e.target.value)
          }}
          onBlur={onBlur}
          aria-describedby={`${id}-d`}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {opts.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      <p id={`${id}-d`} className="min-h-[1rem] text-xs leading-snug">
        {showIssue ? (
          <span className={issue!.level === 'error' ? 'text-danger font-medium' : 'text-warn font-medium'}>
            {issue!.message}
          </span>
        ) : (
          <span className="text-ink-3">{hint || spec.description}</span>
        )}
      </p>
    </div>
  )
}