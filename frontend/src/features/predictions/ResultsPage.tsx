import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, ClipboardList, Crosshair, ShieldAlert } from 'lucide-react'
import { Alert, Badge, Button, Card, Spinner, cx } from '../../components/ui'

import { api, ApiError } from '../../services/api'
import type { PredictionResponse, VesselId } from '../../types/api'
import HeartScene from '../heart-3d/LazyHeartScene'
import { VESSELS, VESSEL_IDS } from '../heart-3d/vesselConfig'
import ExplainabilityPanel from '../explainability/ExplainabilityPanel'
import InputSummary from './InputSummary'
import { OverallCard, VesselCards, VesselDetail } from './ResultCards'

export default function ResultsPage({ predictionId, initialData }: { predictionId?: string; initialData?: PredictionResponse } = {}) {
  const params = useParams<{ id: string }>()
  const id = predictionId ?? params.id
  const [data, setData] = useState<PredictionResponse | null>(initialData ?? null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<VesselId | null>(null)
  const [resetCount, setResetCount] = useState(0)

  useEffect(() => {
    if (initialData) {
      setData(initialData)
      return
    }
    setData(null); setError(null); setSelected(null)
    if (!id) return
    let cancelled = false
    api.getPrediction(id)
      .then((r) => { if (!cancelled) setData(r) })
      .catch((e) => { if (!cancelled) setError(e instanceof ApiError ? e.message : 'Failed to load the prediction.') })
    return () => { cancelled = true }
  }, [id, initialData])

  const risks = useMemo(() => {
    if (!data?.vessels) return undefined
    return Object.fromEntries(VESSEL_IDS.map((v) => [v, data.vessels![v]?.probability ?? null]))
  }, [data])

  const overallProb = data?.overall?.probability ?? 0
  // Positive/negative is decided by the model's tuned threshold, not a fixed 0.5.
  const thr = data?.overall?.threshold ?? 0.5
  const tier: 'high' | 'low' = overallProb >= thr ? 'high' : 'low'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-navy-500">Assessment Report</span>
            <Badge tone={tier === 'high' ? 'red' : 'teal'}>
              {tier === 'high' ? 'CAD flagged' : 'CAD not flagged'}
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
          tier === 'high' ? 'border-red-200 bg-red-50/70 text-red-950' :
          'border-teal-200 bg-teal-50/70 text-teal-950')}>
          <div className="flex items-start gap-3">
            {tier === 'high' ? (
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {tier === 'high' ? 'Screening result: model flags probable coronary artery disease' : 'Screening result: model does not flag coronary artery disease'}
              </p>
              <p className="mt-0.5 text-xs opacity-90 leading-relaxed">
                {tier === 'high'
                  ? `Estimated probability ${(overallProb * 100).toFixed(0)}% is at or above the model's decision threshold (${(thr * 100).toFixed(0)}%). This is a screening estimate from clinical data only; confirm with a clinician and appropriate diagnostic testing.`
                  : `Estimated probability ${(overallProb * 100).toFixed(0)}% is below the model's decision threshold (${(thr * 100).toFixed(0)}%). The model can miss CAD (about 9 in 100 CAD patients were missed on held-out data), so a negative result does not rule it out.`}
              </p>
            </div>
          </div>
        </div>
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

          <HeartScene className="h-[420px] lg:h-[530px]" risks={risks}
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

