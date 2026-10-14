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

export const CLINICAL_PRESETS: { id: string; name: string; tag: string; description: string; values: FeatureValues }[] = [
  {
    id: 'triple-vessel',
    name: 'Severe Triple-Vessel CAD',
    tag: 'Critical Risk',
    description: '67y male with DM, HTN, typical substernal angina, ST elevation & reduced EF (35%).',
    values: {
      Age: 67, Sex: 'Male', Weight: 84, Length: 172,
      DM: true, HTN: true, 'Current Smoker': true, 'EX-Smoker': false, FH: true, DLP: true, Obesity: false,
      'Typical Chest Pain': true, Dyspnea: true, 'Function Class': 3,
      BP: 158, PR: 82, 'Weak Peripheral Pulse': true,
      'St Elevation': true, Tinversion: true, 'Q Wave': false, 'St Depression': true,
      'EF-TTE': 35, 'Regional RWMA': true,
      FBS: 165, CR: 1.4, TG: 240, LDL: 162, HDL: 34, BUN: 24, ESR: 22, HB: 13.8, K: 4.2, Na: 138,
      WBC: 8400, Lymph: 24, Neut: 72, PLT: 260
    }
  },
  {
    id: 'isolated-lad',
    name: 'Isolated LAD Stenosis',
    tag: 'Anterior Ischemia',
    description: '58y male with anterior wall motion abnormality, ST elevation & exertional angina.',
    values: {
      Age: 58, Sex: 'Male', Weight: 78, Length: 176,
      DM: false, HTN: true, 'Current Smoker': true, 'EX-Smoker': false, FH: false, DLP: true, Obesity: false,
      'Typical Chest Pain': true, Dyspnea: false, 'Function Class': 2,
      BP: 142, PR: 76,
      'St Elevation': true, Tinversion: false, 'Q Wave': false, 'St Depression': false,
      'EF-TTE': 42, 'Regional RWMA': true,
      FBS: 105, CR: 1.0, TG: 180, LDL: 145, HDL: 38, BUN: 17, ESR: 12, HB: 14.6, K: 4.4, Na: 141,
      WBC: 6900, Lymph: 32, Neut: 62, PLT: 230
    }
  },
  {
    id: 'low-risk',
    name: 'Low-Risk Non-Cardiac Chest Pain',
    tag: 'Normal / Low Risk',
    description: '41y female with atypical symptoms, preserved EF (64%), normal ECG and biomarkers.',
    values: {
      Age: 41, Sex: 'Female', Weight: 61, Length: 165,
      DM: false, HTN: false, 'Current Smoker': false, 'EX-Smoker': false, FH: false, DLP: false, Obesity: false,
      'Typical Chest Pain': false, Nonanginal: true, Dyspnea: false, 'Function Class': 0,
      BP: 118, PR: 66,
      'St Elevation': false, Tinversion: false, 'Q Wave': false, 'St Depression': false,
      'EF-TTE': 64, 'Regional RWMA': false,
      FBS: 88, CR: 0.8, TG: 95, LDL: 92, HDL: 58, BUN: 14, ESR: 6, HB: 13.2, K: 4.1, Na: 142,
      WBC: 5800, Lymph: 36, Neut: 56, PLT: 215
    }
  }
]

