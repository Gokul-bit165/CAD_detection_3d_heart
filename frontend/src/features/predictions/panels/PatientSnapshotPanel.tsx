import { Activity, AlertCircle, HeartPulse, User } from 'lucide-react'
import type { FeatureSchema } from '../../../types/api'
import { Card } from '../../../components/ui'
import { bmiCategory, functionClassText } from '../../../lib/narrative'

interface PatientSnapshotPanelProps {
  inputs?: Record<string, unknown> | null
  schema?: FeatureSchema | null
  className?: string
}

export default function PatientSnapshotPanel({
  inputs,
  schema,
  className = '',
}: PatientSnapshotPanelProps) {
  if (!inputs) {
    return (
      <Card className={`p-5 ${className}`}>
        <p className="text-sm text-ink-3">Patient data not available.</p>
      </Card>
    )
  }

  const schemaMap = new Map(schema?.features.map((f) => [f.name, f]))
  const getLabel = (key: string) => schemaMap.get(key)?.label || key

  const isTrue = (key: string) => {
    const v = inputs[key]
    return v === true || v === 1 || v === 'Y' || v === 'Yes' || v === 'true'
  }

  // Vitals & Demographics
  const age = inputs['Age']
  const sex = inputs['Sex']
  const bmi = typeof inputs['BMI'] === 'number' ? inputs['BMI'] : null
  const bp = inputs['BP']
  const pr = inputs['PR']

  // Risk Factors (only show positive/present)
  const riskCandidateKeys = [
    'DM',
    'HTN',
    'Current Smoker',
    'EX-Smoker',
    'FH',
    'Obesity',
    'DLP',
    'CRF',
    'CVA',
    'CHF',
    'Dyslipidemia',
  ]
  const presentRiskFactors = riskCandidateKeys.filter(isTrue)

  // Symptoms
  const symptomCandidateKeys = [
    'Typical Chest Pain',
    'Atypical',
    'Nonanginal',
    'Dyspnea',
    'Weak Peripheral Pulse',
    'Edema',
    'Lung Rales',
    'Systolic Murmur',
    'Diastolic Murmur',
  ]
  const presentSymptoms = symptomCandidateKeys.filter(isTrue)
  const functionClass = inputs['Function Class']

  // ECG & Echo
  const ecgCandidateKeys = [
    'Q Wave',
    'St Elevation',
    'St Depression',
    'Tinversion',
    'LVH',
    'Poor R Progression',
    'BBB',
  ]
  const presentEcg = ecgCandidateKeys.filter(isTrue)
  const efTte = typeof inputs['EF-TTE'] === 'number' ? inputs['EF-TTE'] : null
  const rwma = inputs['Region RWMA']
  const vhd = inputs['VHD']

  return (
    <Card
      className={`sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto p-4 space-y-4 shadow-sm ${className}`}
    >
      {/* Patient Header Summary */}
      <div>
        <div className="flex items-center gap-2 pb-2 border-b border-line">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-surface-2 text-ink-2">
            <User className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Patient Snapshot</h3>
            <p className="text-[11px] text-ink-3">Clinical measurements & history</p>
          </div>
        </div>

        {/* Big numbers grid */}
        <div className="grid grid-cols-2 gap-2 pt-3">
          {age != null && (
            <div className="rounded-xl bg-surface-2/70 p-2.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Age / Sex</span>
              <div className="mt-0.5 text-base font-bold text-ink">
                {String(age)} <span className="text-xs font-normal text-ink-2">{sex ? String(sex) : ''}</span>
              </div>
            </div>
          )}

          {bmi != null && (
            <div className="rounded-xl bg-surface-2/70 p-2.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">BMI</span>
              <div className="mt-0.5 text-base font-bold text-ink">
                {bmi.toFixed(1)}{' '}
                <span className="text-[10px] font-medium text-ink-3 block -mt-1">{bmiCategory(bmi)}</span>
              </div>
            </div>
          )}

          {bp != null && (
            <div className="rounded-xl bg-surface-2/70 p-2.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Blood Pressure</span>
              <div className="mt-0.5 text-base font-bold text-ink">
                {String(bp)} <span className="text-[11px] font-normal text-ink-3">mmHg</span>
              </div>
            </div>
          )}

          {pr != null && (
            <div className="rounded-xl bg-surface-2/70 p-2.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Heart Rate</span>
              <div className="mt-0.5 text-base font-bold text-ink">
                {String(pr)} <span className="text-[11px] font-normal text-ink-3">bpm</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Risk Factors */}
      <div className="space-y-1.5 pt-1 border-t border-line">
        <div className="flex items-center justify-between text-xs font-semibold text-ink">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-danger" /> Risk Factors
          </span>
          <span className="text-[10px] text-ink-3 font-normal">
            {presentRiskFactors.length} recorded
          </span>
        </div>

        {presentRiskFactors.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {presentRiskFactors.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-md bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger border border-danger/20"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                {getLabel(k)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-3 italic pt-1">No positive risk factors recorded.</p>
        )}
      </div>

      {/* Symptoms */}
      <div className="space-y-1.5 pt-1 border-t border-line">
        <div className="flex items-center justify-between text-xs font-semibold text-ink">
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-warn" /> Symptoms & Presentation
          </span>
        </div>

        {functionClass != null && (
          <div className="rounded-lg bg-surface-2/60 p-2 text-xs">
            <span className="text-ink-3 text-[10px] uppercase tracking-wider font-semibold block">NYHA Functional Class</span>
            <span className="font-medium text-ink">{functionClassText(Number(functionClass))}</span>
          </div>
        )}

        {presentSymptoms.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {presentSymptoms.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-md bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn border border-warn/25"
              >
                {getLabel(k)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-3 italic">No acute angina/symptom flags recorded.</p>
        )}
      </div>

      {/* ECG & Echo */}
      <div className="space-y-1.5 pt-1 border-t border-line">
        <div className="flex items-center justify-between text-xs font-semibold text-ink">
          <span className="flex items-center gap-1.5">
            <HeartPulse className="h-3.5 w-3.5 text-accent" /> ECG & Echocardiogram
          </span>
        </div>

        {efTte != null && (
          <div className="rounded-lg bg-surface-2/60 p-2 text-xs space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-ink-3 font-medium">Ejection Fraction (EF-TTE)</span>
              <span className={`font-mono font-bold ${efTte < 50 ? 'text-danger' : 'text-ok'}`}>
                {efTte}% {efTte < 50 ? '(Reduced)' : '(Preserved)'}
              </span>
            </div>
            <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  efTte < 50 ? 'bg-danger' : 'bg-ok'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, (efTte / 75) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {presentEcg.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {presentEcg.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-2 border border-line"
              >
                {getLabel(k)}
              </span>
            ))}
          </div>
        )}

        {(rwma != null || vhd != null) && (
          <div className="space-y-1 pt-1 text-[11px] text-ink-2">
            {rwma != null && (
              <div className="flex justify-between border-b border-line/60 py-0.5">
                <span className="text-ink-3">RWMA</span>
                <span className="font-medium text-ink">{String(rwma)}</span>
              </div>
            )}
            {vhd != null && (
              <div className="flex justify-between py-0.5">
                <span className="text-ink-3">Valvular Disease</span>
                <span className="font-medium text-ink">{String(vhd)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}