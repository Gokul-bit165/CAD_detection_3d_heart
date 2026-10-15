import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ClipboardList,
  Database,
  FileSpreadsheet,
  HeartPulse,
  PlayCircle,
  PlugZap,
  Sparkles,
} from 'lucide-react'
import { Alert, Badge, Button, Card, CardHeader, EmptyState } from '../../components/ui'
import { useAppData } from '../../app/AppData'
import { api } from '../../services/api'
import type { PredictionSummary } from '../../types/api'
import HeartScene from '../heart-3d/LazyHeartScene'
import { ModelStatusBadge } from '../../app/AppShell'

export function HistoryTable({ rows }: { rows: PredictionSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-ink-3 border-b border-line">
          <tr>
            <th className="px-5 py-2.5 font-semibold">Case / ID</th>
            <th className="font-semibold">Clinical Profile</th>
            <th className="font-semibold">Time</th>
            <th className="font-semibold">Status</th>
            <th className="pr-5 text-right font-semibold">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {rows.map((r) => {
            return (
              <tr key={r.id} className="hover:bg-surface-2/60 transition-colors">
                <td className="px-5 py-3 font-mono text-[13px] font-medium text-ink">{r.id}</td>
                <td className="text-xs text-ink-3">Patient assessment</td>
                <td className="text-ink-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                <td>
                  <Badge tone={r.status === 'ready' ? 'teal' : 'red'}>{r.status}</Badge>
                </td>
                <td className="pr-5 text-right">
                  {r.has_results ? (
                    <Link
                      className="inline-flex items-center gap-1 font-semibold text-accent hover:underline text-xs"
                      to={`/results/${r.id}`}
                    >
                      Open report <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="text-ink-3 text-xs">None</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  sub?: string
}) {
  return (
    <Card className="p-5 transition-all hover:shadow-md border border-line">
      <div className="flex items-center gap-2 text-ink-3">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</div>
      {sub && <p className="mt-1 text-xs text-ink-3">{sub}</p>}
    </Card>
  )
}

export default function OverviewPage() {
  const { apiOnline, modelInfo } = useAppData()
  const [rows, setRows] = useState<PredictionSummary[] | null>(null)

  useEffect(() => {
    if (apiOnline) api.listPredictions().then(setRows).catch(() => setRows(null))
  }, [apiOnline])

  const modelRuns = rows?.filter((r) => r.status === 'ready').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-line/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent border border-accent/20">
              <Sparkles className="h-3 w-3" /> Multimodal AI Hackathon 2026 • Track A
            </span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-ink">
            CardioVista AI Diagnostics
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-3">
            Coronary artery disease & multi-vessel stenosis risk prediction with real-time interactive 3D digital twin visualization.
          </p>
        </div>
        <Link to="/assessment" className="ml-auto">
          <Button>
            <ClipboardList className="h-4 w-4" /> New Patient Assessment
          </Button>
        </Link>
      </div>

      {apiOnline === false && (
        <Alert tone="error" title="Backend not reachable">
          Start the API (see README) — until then no assessments can be run.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            to: '/assessment',
            icon: <ClipboardList className="h-5 w-5" />,
            title: 'Single patient',
            desc: 'Enter clinical features and get CAD and per-vessel estimates with the 3D heart.',
          },
          {
            to: '/import',
            icon: <FileSpreadsheet className="h-5 w-5" />,
            title: 'Batch import',
            desc: 'Upload many patients at once via CSV or Excel, predict them all and score results against outcomes.',
          },
          {
            to: '/evaluation',
            icon: <HeartPulse className="h-5 w-5" />,
            title: 'Model evaluation',
            desc: 'Held-out test performance of the ensemble: ROC curves, confusion matrices, per-vessel AUC.',
          },
        ].map((c) => (
          <Link key={c.to} to={c.to} className="group block">
            <Card className="flex h-full flex-col justify-between p-4 transition-all hover:border-accent hover:shadow-md border border-line">
              <div>
                <div className="flex items-center gap-2 text-ink">
                  {c.icon}
                  <span className="text-sm font-semibold group-hover:text-accent transition-colors">
                    {c.title}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-3">{c.desc}</p>
              </div>
              <span className="mt-3 flex items-center gap-1 border-t border-line/60 pt-3 text-xs font-semibold text-accent group-hover:underline">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          icon={<Database className="h-4 w-4" />}
          label="Recorded assessments"
          value={rows ? rows.length : '—'}
          sub="Stored securely on local database"
        />
        <Stat
          icon={<PlayCircle className="h-4 w-4" />}
          label="Prediction runs"
          value={rows ? modelRuns : '—'}
          sub="Run with the trained ensemble"
        />
        <Stat
          icon={<PlugZap className="h-4 w-4" />}
          label="Model engine"
          value={<ModelStatusBadge />}
          sub={modelInfo?.model_version ? `Version ${modelInfo.model_version}` : undefined}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden border border-line">
          <CardHeader
            title="3D Heart Digital Twin"
            subtitle="Drag to rotate, scroll to zoom, click any coronary artery"
            action={
              <Link to="/explorer" className="text-sm font-semibold text-accent hover:underline">
                Open full explorer
              </Link>
            }
          />
          <div className="p-3">
            <HeartScene compact className="h-[340px]" selected={null} onSelect={() => {}} />
          </div>
        </Card>

        <Card className="border border-line">
          <CardHeader
            title="CardioVista Architecture"
            subtitle="Dual-layer leakage safety & validation engine"
          />
          <div className="space-y-3 p-5 text-sm">
            {modelInfo ? (
              <>
                <p className="text-ink-2 leading-relaxed">{modelInfo.message}</p>
                <dl className="grid grid-cols-2 gap-3 text-[13px] bg-surface-2 p-3.5 rounded-xl border border-line">
                  <div>
                    <dt className="text-ink-3 text-xs">Prediction Provider</dt>
                    <dd className="font-semibold text-ink mt-0.5">{modelInfo.provider}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3 text-xs">Input Features</dt>
                    <dd className="font-semibold text-ink mt-0.5">{modelInfo.feature_count} validated</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-ink-3 text-xs">Forbidden Leakage Targets</dt>
                    <dd className="font-medium text-ink mt-0.5 font-mono text-xs">
                      {modelInfo.excluded_inputs.slice(0, 4).join(', ')}
                    </dd>
                  </div>
                </dl>
                <div className="flex items-center justify-between text-xs text-ink-3 pt-1">
                  <span>Held-out test evaluation available</span>
                  <Link to="/evaluation" className="font-semibold text-accent underline">
                    View ROC curves & metrics
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-ink-3">Status unavailable while the API is offline.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="border border-line">
        <CardHeader
          title="Recent assessments & cases"
          subtitle="Local audit trail of submitted clinical examinations"
          action={
            <Link to="/history" className="text-sm font-semibold text-accent hover:underline">
              View all history
            </Link>
          }
        />
        <div className="py-2">
          {rows && rows.length > 0 ? (
            <HistoryTable rows={rows.slice(0, 5)} />
          ) : (
            <div className="px-5 pb-4">
              <EmptyState
                title="No assessments yet"
                action={
                  <Link to="/assessment">
                    <Button variant="secondary">Start the first assessment</Button>
                  </Link>
                }
              >
                Saved results appear here after you submit an assessment.
              </EmptyState>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}