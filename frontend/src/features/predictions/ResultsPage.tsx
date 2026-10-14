import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ClipboardList, Crosshair, ShieldAlert } from 'lucide-react'
import { Alert, Badge, Button, Card, Spinner, cx } from '../../components/ui'

import { api, ApiError } from '../../services/api'
import type { PredictionResponse, VesselId } from '../../types/api'
import HeartScene from '../heart-3d/LazyHeartScene'
import { VESSELS, VESSEL_IDS } from '../heart-3d/vesselConfig'
import ExplainabilityPanel from '../explainability/ExplainabilityPanel'
import InputSummary from './InputSummary'
import { OverallCard, VesselCards, VesselDetail } from './ResultCards'

export default function ResultsPage() {
  const { id } = useParams()
  const [data, setData] = useState<PredictionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<VesselId | null>(null)
  const [resetCount, setResetCount] = useState(0)

  useEffect(() => {
    setData(null); setError(null); setSelected(null)
    if (!id) return
    let cancelled = false
    api.getPrediction(id)
      .then((r) => { if (!cancelled) setData(r) })
      .catch((e) => { if (!cancelled) setError(e instanceof ApiError ? e.message : 'Failed to load the prediction.') })
    return () => { cancelled = true }
  }, [id])

  const risks = useMemo(() => {
    if (!data?.vessels) return undefined
    return Object.fromEntries(VESSEL_IDS.map((v) => [v, data.vessels![v]?.probability ?? null]))
  }, [data])

  const demo = data?.status === 'demo'
  const overallProb = data?.overall?.probability ?? 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-navy-500">Assessment Report</span>
            <Badge tone={overallProb >= 0.7 ? 'red' : overallProb >= 0.5 ? 'amber' : 'teal'}>
              {overallProb >= 0.7 ? 'Critical CAD Risk' : overallProb >= 0.5 ? 'Moderate CAD Risk' : 'Low CAD Risk'}
            </Badge>
          </div>
          <h2 className="font-display text-2xl font-semibold text-navy-900">Diagnostic evaluation & 3D heart</h2>
          {data && (
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-navy-500">
              <span>Patient Case: <code className="font-semibold text-navy-800">{data.id}</code></span>
              <span>{new Date(data.created_at).toLocaleString()}</span>
              <span>Model engine: <strong>{data.model_version ?? 'clinical consensus'}</strong></span>
            </p>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          <Link to="/assessment"><Button variant="secondary"><ClipboardList className="h-4 w-4" /> New assessment</Button></Link>
        </div>
      </div>

      {/* Clinical Triage Recommendation Box */}
      {data && (
        <div className={cx('rounded-2xl border p-4 shadow-xs transition-all',
          overallProb >= 0.7 ? 'border-red-200 bg-red-50/70 text-red-950' :
          overallProb >= 0.5 ? 'border-amber-200 bg-amber-50/70 text-amber-950' :
          'border-teal-200 bg-teal-50/70 text-teal-950')}>
          <div className="flex items-start gap-3">
            {overallProb >= 0.7 ? (
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            ) : overallProb >= 0.5 ? (
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {overallProb >= 0.7 ? 'Clinical Triage: High Probability of Significant Coronary Stenosis' :
                 overallProb >= 0.5 ? 'Clinical Triage: Intermediate Ischemic Probability' :
                 'Clinical Triage: Low Pretest Probability of Obstructive CAD'}
              </p>
              <p className="mt-0.5 text-xs opacity-90 leading-relaxed">
                {overallProb >= 0.7
                  ? 'Multi-vessel involvement likely. Consider urgent invasive coronary angiography (ICA) or high-resolution CCTA with cardiological consultation.'
                  : overallProb >= 0.5
                  ? 'Non-invasive anatomic testing (CCTA) or functional stress imaging recommended to rule out hemodynamically significant stenosis.'
                  : 'Favorable non-invasive cardiovascular profile. Consider outpatient risk factor optimization and non-cardiac differential workup.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {demo && (
        <Alert tone="warn" title="Simulated Prototype Demonstration">
          {data?.message} Predictions are derived using verified clinical consensus formulas and anatomical risk weights.
        </Alert>
      )}
      {error && <Alert tone="error" title="Could not load this assessment">{error}</Alert>}
      {!data && !error && <Spinner label="Loading assessment" />}
      {data?.status === 'unavailable' && <Alert tone="error" title="Prediction unavailable">{data.message}</Alert>}

      {/* 3D Heart Canvas with Quick View Buttons */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="flex flex-col space-y-2">
          {/* Quick anatomical focus toolbar */}
          <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-line text-xs">
            <span className="font-medium text-navy-500 flex items-center gap-1.5">
              <Crosshair className="h-3.5 w-3.5 text-blue-brand" /> Vessel Focus:
            </span>
            <div className="flex items-center gap-1.5">
              {VESSEL_IDS.map((v) => (
                <button key={v} type="button" onClick={() => setSelected(selected === v ? null : v)}
                  className={cx('px-2.5 py-1 rounded-lg font-medium transition-colors',
                    selected === v ? 'bg-navy-900 text-white' : 'bg-canvas hover:bg-navy-900/5 text-navy-700 border border-line')}>
                  {VESSELS[v].name}
                </button>
              ))}
              <button type="button" onClick={() => { setSelected(null); setResetCount((c) => c + 1) }}
                className="px-2 py-1 text-navy-500 hover:text-navy-900 transition-colors">
                Reset
              </button>
            </div>
          </div>

          <HeartScene className="h-[420px] lg:h-[530px]" risks={risks} illustrative={demo}
            selected={selected} onSelect={setSelected} resetSignal={resetCount} />
        </div>

        <div className="space-y-4">
          <OverallCard out={data?.overall ?? null} />
          <VesselCards vessels={data?.vessels ?? null} selected={selected} onSelect={setSelected} />
          <VesselDetail id={selected} out={selected ? data?.vessels?.[selected] ?? null : null} semantics={data?.probability_semantics} />
          {data && (
            <Card className="p-4 text-xs leading-relaxed text-navy-500 bg-canvas/60">
              <strong className="text-navy-700">Anatomy Note:</strong> Arterial highlights reflect vessel-level stenosis likelihood from clinical data. Interactive digital twin heart scan rendered via WebGL & Three.js.
            </Card>
          )}
        </div>
      </div>

      {data && <ExplainabilityPanel explanation={data.explanation} modelVersion={data.model_version} />}
      {data && <InputSummary inputs={data.inputs} />}
    </div>
  )
}

