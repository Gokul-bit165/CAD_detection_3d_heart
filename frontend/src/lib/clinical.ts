import type { FeatureSchema } from '../types/api'

export interface LabMarker {
  key: string
  label: string
  value: number
  unit: string
  refLow: number | null
  refHigh: number | null
  isOutside: boolean
  isHigh: boolean
  isLow: boolean
  minBound: number
  maxBound: number
}

// Standard adult reference ranges as clinical fallbacks if schema does not specify ref_low/ref_high
const DEFAULT_LAB_SPECS: Record<
  string,
  { label: string; unit: string; refLow: number; refHigh: number; absMin: number; absMax: number }
> = {
  FBS: { label: 'Fasting Blood Sugar', unit: 'mg/dL', refLow: 70, refHigh: 100, absMin: 50, absMax: 260 },
  LDL: { label: 'LDL Cholesterol', unit: 'mg/dL', refLow: 0, refHigh: 100, absMin: 30, absMax: 240 },
  HDL: { label: 'HDL Cholesterol', unit: 'mg/dL', refLow: 40, refHigh: 60, absMin: 20, absMax: 90 },
  TG: { label: 'Triglycerides', unit: 'mg/dL', refLow: 50, refHigh: 150, absMin: 40, absMax: 350 },
  BP: { label: 'Blood Pressure (Sys)', unit: 'mmHg', refLow: 90, refHigh: 120, absMin: 80, absMax: 200 },
  HB: { label: 'Hemoglobin', unit: 'g/dL', refLow: 12.0, refHigh: 16.5, absMin: 8, absMax: 20 },
  CR: { label: 'Creatinine', unit: 'mg/dL', refLow: 0.6, refHigh: 1.2, absMin: 0.4, absMax: 3.5 },
  'EF-TTE': { label: 'Ejection Fraction', unit: '%', refLow: 50, refHigh: 70, absMin: 20, absMax: 75 },
}

export function getLabMarkers(
  inputs: Record<string, unknown> | null | undefined,
  schema?: FeatureSchema | null
): LabMarker[] {
  if (!inputs) return []

  const schemaMap = new Map(schema?.features.map((f) => [f.name, f]))
  const markers: LabMarker[] = []

  for (const [key, defaultSpec] of Object.entries(DEFAULT_LAB_SPECS)) {
    const rawVal = inputs[key]
    if (rawVal == null || rawVal === '' || typeof rawVal !== 'number' || isNaN(rawVal)) {
      continue
    }

    const val = rawVal
    const spec = schemaMap.get(key)
    const label = spec?.label || defaultSpec.label
    const unit = spec?.unit || defaultSpec.unit

    const refLow = spec?.ref_low ?? defaultSpec.refLow
    const refHigh = spec?.ref_high ?? defaultSpec.refHigh

    const isLow = refLow != null && val < refLow
    const isHigh = refHigh != null && val > refHigh
    const isOutside = isLow || isHigh

    const minBound = Math.min(defaultSpec.absMin, refLow ?? val, val) * 0.95
    const maxBound = Math.max(defaultSpec.absMax, refHigh ?? val, val) * 1.05

    markers.push({
      key,
      label,
      value: val,
      unit,
      refLow,
      refHigh,
      isOutside,
      isHigh,
      isLow,
      minBound,
      maxBound,
    })
  }

  return markers
}

export interface ClinicalBurdenItem {
  subject: string
  value: number // 0..100
  description: string
}

export function calculateClinicalBurden(
  inputs: Record<string, unknown> | null | undefined,
  schema?: FeatureSchema | null
): ClinicalBurdenItem[] {
  if (!inputs) {
    return [
      { subject: 'Risk factors', value: 0, description: 'No recorded risk factors' },
      { subject: 'Symptoms', value: 0, description: 'No recorded symptoms' },
      { subject: 'ECG', value: 0, description: 'No ECG abnormalities recorded' },
      { subject: 'Labs', value: 0, description: 'No lab abnormalities recorded' },
      { subject: 'Cardiac function', value: 0, description: 'Normal cardiac function' },
    ]
  }

  const isTrue = (k: string) => {
    const v = inputs[k]
    return v === true || v === 1 || v === 'Y' || v === 'Yes' || v === 'true'
  }

  // 1. Risk factors (count / 8, clamped to 100)
  const riskKeys = ['DM', 'HTN', 'Current Smoker', 'EX-Smoker', 'FH', 'Obesity', 'DLP', 'CRF', 'CVA', 'CHF']
  const riskCount = riskKeys.filter(isTrue).length
  const riskBurden = Math.min(100, Math.round((riskCount / 8) * 100))

  // 2. Symptoms
  // Typical CP * 2 + Atypical CP + (FC - 1) + Dyspnea, normalised
  let symptomScore = 0
  if (isTrue('Typical Chest Pain')) symptomScore += 40
  if (isTrue('Atypical')) symptomScore += 20
  if (isTrue('Dyspnea')) symptomScore += 20
  const fc = Number(inputs['Function Class'] ?? 1)
  if (fc > 1) {
    symptomScore += (fc - 1) * 15
  }
  const symptomBurden = Math.min(100, Math.max(0, symptomScore))

  // 3. ECG abnormalities
  const ecgKeys = ['Q Wave', 'St Elevation', 'St Depression', 'Tinversion', 'LVH', 'Poor R Progression', 'BBB']
  const ecgCount = ecgKeys.filter(isTrue).length
  const ecgBurden = Math.min(100, Math.round((ecgCount / 6) * 100))

  // 4. Lab abnormalities
  const labs = getLabMarkers(inputs, schema)
  const labOutsideCount = labs.filter((l) => l.isOutside).length
  const labBurden = labs.length > 0 ? Math.round((labOutsideCount / labs.length) * 100) : 0

  // 5. Cardiac function (100 - clamp(EF-TTE - 30, 0, 40) / 40 * 100)
  const rawEf = inputs['EF-TTE']
  let efBurden = 0
  if (typeof rawEf === 'number' && !isNaN(rawEf)) {
    const clamped = Math.min(40, Math.max(0, rawEf - 30))
    efBurden = Math.round(100 - (clamped / 40) * 100)
  }

  return [
    { subject: 'Risk factors', value: riskBurden, description: `${riskCount} risk factors present` },
    { subject: 'Symptoms', value: symptomBurden, description: `${symptomBurden}% symptomatic burden` },
    { subject: 'ECG', value: ecgBurden, description: `${ecgCount} abnormal ECG signs` },
    { subject: 'Labs', value: labBurden, description: `${labOutsideCount} of ${labs.length} labs out of range` },
    { subject: 'Cardiac function', value: efBurden, description: `EF-TTE burden: ${efBurden}%` },
  ]
}