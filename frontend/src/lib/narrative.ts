import type { FeatureContribution, FeatureSpec, TargetOutput, VesselFinding } from '../types/api'

export function driverSentence(
  c: FeatureContribution,
  spec?: FeatureSpec
): string {
  const pts = Math.round(Math.abs(c.contribution) * 100)
  const ptsText = pts === 0 ? 'less than 1 point' : `${pts} point${pts === 1 ? '' : 's'}`
  const label = c.label || c.feature
  const isPositive = c.contribution > 0

  // Check if binary / boolean feature
  const isBool = typeof c.value === 'boolean' || c.value === 'Y' || c.value === 'N' || c.value === 'Yes' || c.value === 'No'
  if (isBool) {
    const isYes = c.value === true || c.value === 'Y' || c.value === 'Yes'
    const lowerLabel = label.toLowerCase()
    if (isPositive) {
      return isYes
        ? `Having ${lowerLabel} raised the estimate by about ${ptsText}.`
        : `Absence of ${lowerLabel} raised the estimate by about ${ptsText}.`
    } else {
      return isYes
        ? `Having ${lowerLabel} lowered the estimate by about ${ptsText}.`
        : `Absence of ${lowerLabel} lowered the estimate by about ${ptsText}.`
    }
  }

  // Continuous / numeric or string feature with reference range
  const valStr = c.unit ? `${c.value} ${c.unit}` : `${c.value}`
  let relation = ''
  if (typeof c.value === 'number' && spec) {
    if (spec.ref_high != null && c.value > spec.ref_high) {
      relation = 'above the usual range and '
    } else if (spec.ref_low != null && c.value < spec.ref_low) {
      relation = 'below the usual range and '
    }
  }

  if (isPositive) {
    if (relation) {
      return `${label} (${valStr}) is ${relation}raised the estimate by about ${ptsText}.`
    }
    return `${label} (${valStr}) raised the estimate by about ${ptsText}.`
  } else {
    return `${label} (${valStr}) lowered the estimate by about ${ptsText}.`
  }
}

export function verdictSentence(out: TargetOutput | undefined | null): {
  headline: string
  subtext: string
} {
  if (!out) {
    return {
      headline: 'Assessment unavailable',
      subtext: 'No model estimate could be produced for this record.',
    }
  }

  const isFlagged = out.predicted_class === 'positive' || (out.probability != null && out.threshold != null && out.probability >= out.threshold)

  if (isFlagged) {
    return {
      headline: 'The model flags probable coronary artery disease.',
      subtext:
        'This is a screening estimate from clinical data only. Confirm with a clinician and appropriate diagnostic testing.',
    }
  }

  return {
    headline: 'The model does not flag coronary artery disease.',
    subtext:
      'This is a screening estimate from clinical data only. Confirm with a clinician and appropriate diagnostic testing. A negative result does not rule out disease.',
  }
}

export function vesselSentence(f: VesselFinding): string {
  const isStenotic = f.status === 'stenotic' || f.probability >= f.threshold
  if (isStenotic) {
    const confidenceSuffix = f.reliability === 'low' ? ' (low confidence model)' : ''
    return `The model flags probable stenosis in the ${f.vessel} artery${confidenceSuffix}.`
  }
  return `The model does not flag stenosis in the ${f.vessel} artery.`
}

export function bmiCategory(bmi: number | null | undefined): string {
  if (bmi == null || isNaN(bmi) || bmi <= 0) return 'Unknown'
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25.0) return 'Normal weight'
  if (bmi < 30.0) return 'Overweight'
  return 'Obese'
}

export function functionClassText(fc: number | string | null | undefined): string {
  if (fc == null) return 'Not recorded'
  const num = typeof fc === 'number' ? fc : parseInt(fc, 10)
  switch (num) {
    case 1:
      return 'Class I (No limitation)'
    case 2:
      return 'Class II (Slight limitation)'
    case 3:
      return 'Class III (Marked limitation)'
    case 4:
      return 'Class IV (Severe limitation)'
    default:
      return `Class ${fc}`
  }
}