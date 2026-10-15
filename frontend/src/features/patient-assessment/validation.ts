import type { FeatureSchema, FeatureSpec, FeatureValue, FeatureValues } from '../../types/api'

export interface FieldIssue { level: 'error' | 'warning'; message: string }

export function bmiOf(v: FeatureValues): number | null {
  const w = Number(v.Weight), h = Number(v.Length)
  if (!v.Weight || !v.Length || !(w > 0) || !(h > 0)) return null
  return Math.round((w / (h / 100) ** 2) * 10) / 10
}

export function validateField(spec: FeatureSpec, value: FeatureValue | undefined): FieldIssue | null {
  if (spec.derived) return null
  const empty = value === undefined || value === null || value === ''
  if (empty) return spec.required ? { level: 'error', message: 'Required' } : null
  if (spec.kind !== 'number') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return { level: 'error', message: 'Enter a number' }
  if (spec.hard_min != null && n < spec.hard_min || spec.hard_max != null && n > spec.hard_max)
    return { level: 'error', message: `Must be between ${spec.hard_min} and ${spec.hard_max}${spec.unit ? ' ' + spec.unit : ''}` }
  if (spec.observed_min != null && spec.observed_max != null && (n < spec.observed_min || n > spec.observed_max))
    return { level: 'warning', message: `Outside the range seen in the training data (${spec.observed_min}–${spec.observed_max}); the model would be extrapolating` }
  return null
}

export function defaults(schema: FeatureSchema): FeatureValues {
  const out: FeatureValues = {}
  for (const f of schema.features) {
    if (f.derived) continue
    if (f.kind === 'binary') out[f.name] = false
    else if (f.kind === 'categorical' && f.name !== 'Sex') out[f.name] = String(f.options?.find((o) => o.value === 'N')?.value ?? f.options?.[0]?.value ?? '')
    else if (f.kind === 'ordinal') out[f.name] = Number(f.options?.[0]?.value ?? 0)
    else out[f.name] = ''
  }
  return out
}

/** Convert form state to the API payload: numbers parsed, blanks -> null, BMI derived. */
export function toPayload(schema: FeatureSchema, v: FeatureValues): FeatureValues {
  const out: FeatureValues = {}
  for (const f of schema.features) {
    const x = v[f.name]
    if (f.derived) continue
    out[f.name] = x === '' || x === undefined ? null : f.kind === 'number' ? Number(x) : x
  }
  const bmi = bmiOf(v)
  if (bmi != null) out.BMI = bmi
  return out
}

/** Synthetic values for exercising the UI. Not a real patient. */
export const EXAMPLE_VALUES: FeatureValues = {
  Age: 58, Sex: 'Male', Weight: 82, Length: 172,
  HTN: true, DLP: true, 'Current Smoker': false, 'EX-Smoker': true,
  'Typical Chest Pain': true, Dyspnea: true, 'Function Class': 2,
  BP: 140, PR: 78,
  'St Depression': true, Tinversion: true,
  FBS: 105, CR: 1.0, TG: 160, LDL: 120, HDL: 42, BUN: 18, ESR: 15, HB: 14.2, K: 4.3, Na: 140,
  WBC: 7200, Lymph: 30, Neut: 62, PLT: 245, 'EF-TTE': 50, 'Region RWMA': 1,
}

