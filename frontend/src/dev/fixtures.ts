import type { PredictionResponse } from '../types/api'

export const FIXTURE_HIGH: PredictionResponse = {
  id: 'fixture-high',
  status: 'ready',
  created_at: '2026-10-15T09:30:00Z',
  provider: 'trained',
  model_version: '2026-10-15-ens5',
  message: null,
  probability_semantics: 'Estimated likelihood from clinical data.',
  disclaimer: 'Research prototype. Not a diagnostic device.',
  overall: {
    target: 'CAD', label: 'Overall CAD', probability: 0.87, predicted_class: 'positive',
    class_text: 'CAD', threshold: 0.42, reliability: 'good',
  },
  vessels: {
    LAD: { target: 'LAD', label: 'LAD', probability: 0.652, predicted_class: 'positive', class_text: 'Stenosis', threshold: 0.4, reliability: 'good' },
    LCX: { target: 'LCX', label: 'LCX', probability: 0.328, predicted_class: 'negative', class_text: 'Normal', threshold: 0.45, reliability: 'low' },
    RCA: { target: 'RCA', label: 'RCA', probability: 0.538, predicted_class: 'positive', class_text: 'Stenosis', threshold: 0.48, reliability: 'low' },
  },
  findings: [
    { vessel: 'LAD', status: 'stenotic', probability: 0.652, threshold: 0.4, severity: 'moderate', reliability: 'good', rank: 1 },
    { vessel: 'RCA', status: 'stenotic', probability: 0.538, threshold: 0.48, severity: 'moderate', reliability: 'low', rank: 2 },
    { vessel: 'LCX', status: 'normal', probability: 0.328, threshold: 0.45, severity: null, reliability: 'low', rank: 3 },
  ],
  explanation: {
    method: 'Occlusion (value replaced by training-typical, ensemble)',
    note: 'Impact of each value on the model output.',
    baselines: { CAD: 0.31, LAD: 0.22, LCX: 0.2, RCA: 0.25 },
    contributions: [
      // CAD contributions
      { target: 'CAD', feature: 'Typical Chest Pain', label: 'Typical chest pain', value: true, contribution: 0.21 },
      { target: 'CAD', feature: 'Age', label: 'Age', value: 67, unit: 'years', contribution: 0.12 },
      { target: 'CAD', feature: 'FBS', label: 'Fasting blood sugar', value: 180, unit: 'mg/dL', contribution: 0.09 },
      { target: 'CAD', feature: 'EF-TTE', label: 'Ejection fraction', value: 40, unit: '%', contribution: 0.07 },
      { target: 'CAD', feature: 'HTN', label: 'Hypertension', value: true, contribution: 0.05 },
      { target: 'CAD', feature: 'DM', label: 'Diabetes mellitus', value: true, contribution: 0.04 },
      { target: 'CAD', feature: 'TG', label: 'Triglycerides', value: 190, unit: 'mg/dL', contribution: 0.03 },
      { target: 'CAD', feature: 'HDL', label: 'HDL cholesterol', value: 52, unit: 'mg/dL', contribution: -0.03 },
      { target: 'CAD', feature: 'Current Smoker', label: 'Current smoker', value: false, contribution: -0.04 },
      { target: 'CAD', feature: 'Sex', label: 'Sex', value: 'Male', contribution: 0.02 },
      // LAD contributions
      { target: 'LAD', feature: 'Typical Chest Pain', label: 'Typical chest pain', value: true, contribution: 0.18 },
      { target: 'LAD', feature: 'Age', label: 'Age', value: 67, unit: 'years', contribution: 0.09 },
      { target: 'LAD', feature: 'EF-TTE', label: 'Ejection fraction', value: 40, unit: '%', contribution: 0.06 },
      { target: 'LAD', feature: 'FBS', label: 'Fasting blood sugar', value: 180, unit: 'mg/dL', contribution: 0.05 },
      { target: 'LAD', feature: 'HTN', label: 'Hypertension', value: true, contribution: 0.04 },
      { target: 'LAD', feature: 'HDL', label: 'HDL cholesterol', value: 52, unit: 'mg/dL', contribution: -0.02 },
      // LCX contributions
      { target: 'LCX', feature: 'Age', label: 'Age', value: 67, unit: 'years', contribution: 0.06 },
      { target: 'LCX', feature: 'DM', label: 'Diabetes mellitus', value: true, contribution: 0.04 },
      { target: 'LCX', feature: 'Typical Chest Pain', label: 'Typical chest pain', value: true, contribution: 0.03 },
      { target: 'LCX', feature: 'HTN', label: 'Hypertension', value: true, contribution: 0.02 },
      { target: 'LCX', feature: 'Current Smoker', label: 'Current smoker', value: false, contribution: -0.03 },
      // RCA contributions
      { target: 'RCA', feature: 'Typical Chest Pain', label: 'Typical chest pain', value: true, contribution: 0.11 },
      { target: 'RCA', feature: 'Age', label: 'Age', value: 67, unit: 'years', contribution: 0.08 },
      { target: 'RCA', feature: 'FBS', label: 'Fasting blood sugar', value: 180, unit: 'mg/dL', contribution: 0.05 },
      { target: 'RCA', feature: 'DM', label: 'Diabetes mellitus', value: true, contribution: 0.03 },
      { target: 'RCA', feature: 'EF-TTE', label: 'Ejection fraction', value: 40, unit: '%', contribution: 0.02 },
      { target: 'RCA', feature: 'HDL', label: 'HDL cholesterol', value: 52, unit: 'mg/dL', contribution: -0.02 },
    ],
  },
  inputs: {
    Age: 67, Sex: 'Male', BP: 150, PR: 82, FBS: 180, LDL: 142, HDL: 52, TG: 190,
    'EF-TTE': 40, HTN: true, DM: true, 'Typical Chest Pain': true, 'Atypical': false,
    'Nonanginal': false, 'Exertional CP': false, 'Current Smoker': false,
    'Ex-Smoker': false, 'FH': true, 'Obesity': false, 'CRF': false, 'CVA': false,
    'Airway disease': false, 'Thyroid Disease': false, 'CHF': false, 'DLP': true,
    'Weak Peripheral Pulse': false, 'Lung rales': false, 'Systolic Murmur': false,
    'Diastolic Murmur': false, 'Dyspnea': true, 'Function Class': 2,
    'Edema': false, 'Tinversion': true, 'Q Wave': false, 'St Elevation': false,
    'St Depression': true, 'LVH': false, 'Poor R Progression': true,
    'BBB': false, HB: 14.2, CR: 1.1, K: 4.3, Na: 140, WBC: 7800, Lymph: 30,
    Neut: 62, PLT: 245, 'Region RWMA': 1, VHD: 'Mild',
    Weight: 82, Height: 172, BMI: 27.7,
  },
}

export const FIXTURE_LOW: PredictionResponse = {
  id: 'fixture-low',
  status: 'ready',
  created_at: '2026-10-15T10:00:00Z',
  provider: 'trained',
  model_version: '2026-10-15-ens5',
  message: null,
  probability_semantics: 'Estimated likelihood from clinical data.',
  disclaimer: 'Research prototype. Not a diagnostic device.',
  overall: {
    target: 'CAD', label: 'Overall CAD', probability: 0.12, predicted_class: 'negative',
    class_text: 'Normal', threshold: 0.42, reliability: 'good',
  },
  vessels: {
    LAD: { target: 'LAD', label: 'LAD', probability: 0.15, predicted_class: 'negative', class_text: 'Normal', threshold: 0.4, reliability: 'good' },
    LCX: { target: 'LCX', label: 'LCX', probability: 0.09, predicted_class: 'negative', class_text: 'Normal', threshold: 0.45, reliability: 'low' },
    RCA: { target: 'RCA', label: 'RCA', probability: 0.11, predicted_class: 'negative', class_text: 'Normal', threshold: 0.48, reliability: 'low' },
  },
  findings: [
    { vessel: 'LAD', status: 'normal', probability: 0.15, threshold: 0.4, severity: null, reliability: 'good', rank: 1 },
    { vessel: 'RCA', status: 'normal', probability: 0.11, threshold: 0.48, severity: null, reliability: 'low', rank: 2 },
    { vessel: 'LCX', status: 'normal', probability: 0.09, threshold: 0.45, severity: null, reliability: 'low', rank: 3 },
  ],
  explanation: {
    method: 'Occlusion (value replaced by training-typical, ensemble)',
    note: 'Impact of each value on the model output.',
    baselines: { CAD: 0.31, LAD: 0.22, LCX: 0.2, RCA: 0.25 },
    contributions: [
      { target: 'CAD', feature: 'Age', label: 'Age', value: 38, unit: 'years', contribution: -0.08 },
      { target: 'CAD', feature: 'HDL', label: 'HDL cholesterol', value: 72, unit: 'mg/dL', contribution: -0.05 },
      { target: 'CAD', feature: 'Typical Chest Pain', label: 'Typical chest pain', value: false, contribution: -0.04 },
      { target: 'CAD', feature: 'EF-TTE', label: 'Ejection fraction', value: 60, unit: '%', contribution: -0.03 },
      { target: 'CAD', feature: 'Current Smoker', label: 'Current smoker', value: false, contribution: -0.02 },
      { target: 'LAD', feature: 'Age', label: 'Age', value: 38, unit: 'years', contribution: -0.04 },
      { target: 'LAD', feature: 'Typical Chest Pain', label: 'Typical chest pain', value: false, contribution: -0.03 },
      { target: 'LCX', feature: 'Age', label: 'Age', value: 38, unit: 'years', contribution: -0.05 },
      { target: 'LCX', feature: 'HDL', label: 'HDL cholesterol', value: 72, unit: 'mg/dL', contribution: -0.03 },
      { target: 'RCA', feature: 'Age', label: 'Age', value: 38, unit: 'years', contribution: -0.06 },
      { target: 'RCA', feature: 'Typical Chest Pain', label: 'Typical chest pain', value: false, contribution: -0.04 },
    ],
  },
  inputs: {
    Age: 38, Sex: 'Female', BP: 118, PR: 70, FBS: 92, LDL: 98, HDL: 72, TG: 110,
    'EF-TTE': 60, HTN: false, DM: false, 'Typical Chest Pain': false, 'Atypical': false,
    'Nonanginal': false, 'Exertional CP': false, 'Current Smoker': false,
    'Ex-Smoker': false, 'FH': false, 'Obesity': false, 'CRF': false, 'CVA': false,
    'Airway disease': false, 'Thyroid Disease': false, 'CHF': false, 'DLP': false,
    'Weak Peripheral Pulse': false, 'Lung rales': false, 'Systolic Murmur': false,
    'Diastolic Murmur': false, 'Dyspnea': false, 'Function Class': 1,
    'Edema': false, 'Tinversion': false, 'Q Wave': false, 'St Elevation': false,
    'St Depression': false, 'LVH': false, 'Poor R Progression': false,
    'BBB': false, CR: 0.9, K: 4.1, Na: 141, WBC: 6200, Lymph: 35,
    Neut: 55, PLT: 260, 'Region RWMA': 0, VHD: 'Normal',
    Weight: 62, Height: 165, BMI: 22.8,
  },
}

export const FIXTURE_OLD: PredictionResponse = {
  id: 'fixture-old',
  status: 'ready',
  created_at: '2026-09-20T14:00:00Z',
  provider: 'trained',
  model_version: '2026-09-18-ens5',
  message: null,
  probability_semantics: 'Estimated likelihood from clinical data.',
  disclaimer: 'Research prototype. Not a diagnostic device.',
  overall: {
    target: 'CAD', label: 'Overall CAD', probability: 0.87, predicted_class: 'positive',
    class_text: 'CAD', threshold: 0.42, reliability: 'good',
  },
  vessels: {
    LAD: { target: 'LAD', label: 'LAD', probability: 0.652, predicted_class: 'positive', class_text: 'Stenosis', threshold: 0.4, reliability: 'good' },
    LCX: { target: 'LCX', label: 'LCX', probability: 0.328, predicted_class: 'negative', class_text: 'Normal', threshold: 0.45, reliability: 'low' },
    RCA: { target: 'RCA', label: 'RCA', probability: 0.538, predicted_class: 'positive', class_text: 'Stenosis', threshold: 0.48, reliability: 'low' },
  },
  // Old record: no findings, no explanation
  explanation: null,
  inputs: {
    Age: 67, Sex: 'Male', BP: 150, PR: 82, FBS: 180, LDL: 142, HDL: 52, TG: 190,
    'EF-TTE': 40, HTN: true, DM: true, 'Typical Chest Pain': true,
    'Current Smoker': false, 'FH': true, 'DLP': true, 'Dyspnea': true,
    'Function Class': 2, 'St Depression': true, 'Poor R Progression': true,
    'Tinversion': true, Weight: 82, Height: 172, BMI: 27.7,
  },
}

export const FIXTURE_IDS = ['fixture-high', 'fixture-low', 'fixture-old'] as const
export type FixtureId = (typeof FIXTURE_IDS)[number]

const FIXTURES: Record<FixtureId, PredictionResponse> = {
  'fixture-high': FIXTURE_HIGH,
  'fixture-low': FIXTURE_LOW,
  'fixture-old': FIXTURE_OLD,
}

export function isFixtureId(id: string): id is FixtureId {
  return (FIXTURE_IDS as readonly string[]).includes(id)
}

export function getFixture(id: FixtureId): PredictionResponse {
  return FIXTURES[id]
}

export function listFixtureSummaries() {
  return FIXTURE_IDS.map((id) => {
    const f = FIXTURES[id]
    return {
      id,
      created_at: f.created_at,
      status: f.status,
      provider: f.provider,
      model_version: f.model_version,
      has_results: true,
    }
  })
}
