import { useEffect, useState } from 'react'
import { LineChart as LineIcon } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Alert, Badge, Card, CardHeader, EmptyState, Spinner, cx } from '../../components/ui'
import { api, ApiError } from '../../services/api'
import type { EvaluationResponse, TargetEvaluation, TargetId } from '../../types/api'

const TARGETS: { id: TargetId; label: string }[] = [
  { id: 'CAD', label: 'Overall CAD' }, { id: 'LAD', label: 'LAD' }, { id: 'LCX', label: 'LCX' }, { id: 'RCA', label: 'RCA' },
]
const METRICS: [keyof TargetEvaluation, string][] = [['accuracy', 'Accuracy'], ['precision', 'Precision'], ['recall', 'Recall'], ['f1', 'F1-score'], ['roc_auc', 'ROC-AUC']]
const f3 = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(3))

function TargetSection({ t, ev }: { t: { id: TargetId; label: string }; ev: TargetEvaluation | undefined }) {
  if (!ev) return <Card className="p-5"><h3 className="font-semibold">{t.label}</h3><p className="mt-2 text-sm text-navy-500">No evaluation supplied for this target.</p></Card>
  const cm = ev.confusion_matrix
  return (
    <Card>
      <CardHeader title={t.label} subtitle={ev.n_samples != null ? `${ev.n_samples} evaluation samples` : 'Sample count not supplied'} />
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr_1fr]">
        <dl className="grid grid-cols-2 gap-3 self-start">
          {METRICS.map(([k, label]) => (
            <div key={k} className="rounded-xl bg-canvas p-3"><dt className="text-xs text-navy-500">{label}</dt><dd className="text-lg font-semibold">{f3(ev[k] as number | null | undefined)}</dd></div>
          ))}
        </dl>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-500">Confusion matrix</p>
          {cm && cm.length === 2 ? (
            <div className="grid grid-cols-[auto_1fr_1fr] gap-1 text-center text-sm">
              <span /><span className="text-xs text-navy-500">Pred. neg</span><span className="text-xs text-navy-500">Pred. pos</span>
              {[['Actual neg', cm[0]], ['Actual pos', cm[1]]].map(([lab, row]) => (
                <div key={lab as string} className="contents">
                  <span className="self-center pr-2 text-right text-xs text-navy-500">{lab as string}</span>
                  {(row as number[]).map((n, i) => <span key={i} className={cx('rounded-lg py-3 text-lg font-semibold', (lab === 'Actual neg') === (i === 0) ? 'bg-teal-soft text-teal-800' : 'bg-red-50 text-red-800')}>{n}</span>)}
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-navy-500">Not supplied.</p>}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-500">ROC curve</p>
          {ev.roc_curve?.length ? (
            <div className="h-44">
              <ResponsiveContainer>
                <LineChart data={ev.roc_curve} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid stroke="#e3e8ee" />
                  <XAxis dataKey="fpr" type="number" domain={[0, 1]} tick={{ fontSize: 11 }} />
                  <YAxis type="number" domain={[0, 1]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => Number(v).toFixed(3)} />
                  <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#a9b8c8" strokeDasharray="4 4" />
                  <Line dataKey="tpr" stroke="#0d9488" dot={false} strokeWidth={2} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-navy-500">Not supplied.</p>}
        </div>
      </div>
    </Card>
  )
}

export default function EvaluationPage() {
  const [data, setData] = useState<EvaluationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { api.evaluation().then(setData).catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load evaluation')) }, [])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold text-navy-900">Model evaluation</h2>
        <p className="mt-1 text-sm text-navy-500">Held-out performance of the trained models, shown exactly as supplied with the model artifacts.</p>
      </div>
      {error && <Alert tone="error" title="Could not load evaluation">{error}</Alert>}
      {!data && !error && <Spinner />}
      {data && !data.available && (
        <Card className="p-5">
          <EmptyState icon={<LineIcon className="h-8 w-8" />} title="Evaluation results not yet connected">
            Accuracy, precision, recall, F1, ROC-AUC, confusion matrices and ROC curves for CAD, LAD, LCX and RCA will appear
            here once <code>backend/model_artifacts/eval_report.json</code> is provided (format in docs/MODEL_INTEGRATION.md). No figures are shown until then.
          </EmptyState>
        </Card>
      )}
      {data?.available && data.report && (
        <>
          <Card className="p-5 text-sm">
            <div className="flex flex-wrap items-center gap-2"><Badge tone="blue">Model {data.report.model_version}</Badge>{data.report.generated_at && <span className="text-xs text-navy-500">{data.report.generated_at}</span>}</div>
            <p className="mt-2"><strong>Validation methodology:</strong> {data.report.methodology}</p>
            {data.report.dataset_note && <p className="mt-1 text-navy-500">{data.report.dataset_note}</p>}
          </Card>
          {TARGETS.map((t) => <TargetSection key={t.id} t={t} ev={data.report!.targets[t.id]} />)}
        </>
      )}
    </div>
  )
}
