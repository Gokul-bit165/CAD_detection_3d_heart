export type Status = 'demo' | 'ready' | 'unavailable'
export type VesselId = 'LAD' | 'LCX' | 'RCA'
export type TargetId = 'CAD' | VesselId

export interface FeatureOption { value: string | number; label: string; dataset_value?: string | number | null }

export interface FeatureSpec {
  name: string
  label: string
  group: string
  kind: 'number' | 'binary' | 'categorical' | 'ordinal'
  unit?: string | null
  description: string
  required: boolean
  derived: boolean
  hard_min?: number | null
  hard_max?: number | null
  observed_min?: number | null
  observed_max?: number | null
  step?: number | null
  ref_range?: string | null
  options?: FeatureOption[] | null
  dataset_encoding?: 'Y/N' | '0/1' | null
  note?: string | null
}

export interface FeatureSchema {
  groups: Record<string, string>
  features: FeatureSpec[]
  excluded_inputs: string[]
  unsupported_groups: { group: string; reason: string }[]
}

export type FeatureValue = number | string | boolean | null
export type FeatureValues = Record<string, FeatureValue>

export interface TargetOutput {
  target: TargetId
  label: string
  probability: number | null
  predicted_class: 'positive' | 'negative' | null
  class_text: string | null
  illustrative: boolean
}

export interface FeatureContribution {
  feature: string
  label: string
  value: FeatureValue
  unit?: string | null
  contribution: number
  target: TargetId
}

export interface Explanation {
  method: string
  illustrative: boolean
  note?: string | null
  contributions: FeatureContribution[]
}

export interface PredictionResponse {
  id: string | null
  status: Status
  created_at: string
  provider: string
  model_version: string | null
  message: string | null
  probability_semantics: string
  overall: TargetOutput | null
  vessels: Record<VesselId, TargetOutput> | null
  explanation: Explanation | null
  inputs: FeatureValues | null
  disclaimer: string
}

export interface PredictionSummary {
  id: string
  created_at: string
  status: Status
  provider: string
  model_version: string | null
  has_results: boolean
}

export interface ModelInfo {
  provider: string
  status: Status
  model_version: string | null
  message: string
  targets: string[]
  expected_artifacts: string[]
  found_artifacts: string[]
  excluded_inputs: string[]
  feature_count: number
}

export interface Health { status: 'ok'; api_version: string; provider: string; model_status: Status; time: string }

export interface TargetEvaluation {
  accuracy?: number | null
  precision?: number | null
  recall?: number | null
  f1?: number | null
  roc_auc?: number | null
  confusion_matrix?: number[][] | null
  roc_curve?: { fpr: number; tpr: number }[] | null
  n_samples?: number | null
}

export interface EvaluationResponse {
  available: boolean
  message: string
  report: {
    model_version: string
    methodology: string
    dataset_note?: string | null
    generated_at?: string | null
    targets: Partial<Record<TargetId, TargetEvaluation>>
  } | null
}
