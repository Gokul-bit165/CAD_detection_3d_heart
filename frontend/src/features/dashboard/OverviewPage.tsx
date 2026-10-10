import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Database, PlayCircle, PlugZap } from 'lucide-react'
import { useAppData } from '../../app/AppData'
import { ModelStatusBadge } from '../../app/AppShell'
import { Alert, Badge, Button, Card, CardHeader, EmptyState } from '../../components/ui'
import { api } from '../../services/api'
import type { PredictionSummary } from '../../types/api'
import HeartScene from '../heart-3d/LazyHeartScene'

export function HistoryTable({ rows }: { rows: PredictionSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="text-xs text-navy-500">
          <tr><th className="px-5 py-2 font-medium">Prediction ID</th><th className="font-medium">Time</th><th className="font-medium">Status</th><th className="font-medium">Model</th><th className="pr-5 text-right font-medium">Results</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-line hover:bg-canvas/70">
              <td className="px-5 py-2.5 font-mono text-[13px]">{r.id}</td>
              <td className="text-navy-700">{new Date(r.created_at).toLocaleString()}</td>
              <td><Badge tone={r.status === 'demo' ? 'amber' : r.status === 'ready' ? 'teal' : 'red'}>{r.status}</Badge></td>
              <td className="text-navy-700">{r.model_version ?? '—'}</td>
              <td className="pr-5 text-right">{r.has_results ? <Link className="font-medium text-blue-brand underline" to={`/results/${r.id}`}>Open</Link> : <span className="text-navy-500">None</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-navy-500">{icon}<span className="text-xs font-semibold uppercase tracking-wider">{label}</span></div>
      <div className="mt-2 text-2xl font-semibold text-navy-900">{value}</div>
      {sub && <p className="mt-0.5 text-xs text-navy-500">{sub}</p>}
    </Card>
  )
}

export default function OverviewPage() {
  const { apiOnline, modelInfo } = useAppData()
  const [rows, setRows] = useState<PredictionSummary[] | null>(null)
  useEffect(() => { if (apiOnline) api.listPredictions().then(setRows).catch(() => setRows(null)) }, [apiOnline])

  const demoRuns = rows?.filter((r) => r.status === 'demo').length ?? 0
  const modelRuns = rows?.filter((r) => r.status === 'ready').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-navy-900">Welcome to CardioVista</h2>
          <p className="mt-1 max-w-2xl text-sm text-navy-500">Predict coronary artery disease and LAD, LCX and RCA stenosis from clinical data, and explore the output on an interactive 3D heart.</p>
        </div>
        <Link to="/assessment" className="ml-auto"><Button><ClipboardList className="h-4 w-4" /> New Assessment</Button></Link>
      </div>

      {apiOnline === false && <Alert tone="error" title="Backend not reachable">Start the API (see README) — until then no assessments can be run.</Alert>}
      {modelInfo?.status === 'demo' && <Alert tone="warn" title="Research / Demo Mode">No trained model is connected. Assessments return clearly labelled placeholder outputs for interface testing only.</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<Database className="h-4 w-4" />} label="Recorded assessments" value={rows ? rows.length : '—'} sub="Saved locally on this machine" />
        <Stat icon={<PlayCircle className="h-4 w-4" />} label="Prediction runs" value={rows ? demoRuns + modelRuns : '—'} sub={rows ? `${demoRuns} demo · ${modelRuns} trained model` : undefined} />
        <Stat icon={<PlugZap className="h-4 w-4" />} label="Model connection" value={<ModelStatusBadge />} sub={modelInfo?.model_version ? `Version ${modelInfo.model_version}` : 'No trained model version'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="3D heart" subtitle="Drag to rotate, scroll to zoom, click a vessel" action={<Link to="/explorer" className="text-sm font-medium text-blue-brand underline">Open explorer</Link>} />
          <div className="p-3"><HeartScene compact className="h-[340px]" selected={null} onSelect={() => {}} /></div>
        </Card>
        <Card>
          <CardHeader title="Model status" />
          <div className="space-y-3 p-5 text-sm">
            {modelInfo ? (
              <>
                <p className="text-navy-700">{modelInfo.message}</p>
                <dl className="grid grid-cols-2 gap-2 text-[13px]">
                  <div><dt className="text-navy-500">Provider</dt><dd className="font-medium">{modelInfo.provider}</dd></div>
                  <div><dt className="text-navy-500">Input features</dt><dd className="font-medium">{modelInfo.feature_count}</dd></div>
                  <div className="col-span-2"><dt className="text-navy-500">Excluded (target leakage)</dt><dd className="font-medium">{modelInfo.excluded_inputs.slice(0, 4).join(', ')}</dd></div>
                </dl>
                {modelInfo.provider === 'trained' && (
                  <p className="text-xs text-navy-500">Artifacts found: {modelInfo.found_artifacts.length}/{modelInfo.expected_artifacts.length}</p>
                )}
              </>
            ) : <p className="text-navy-500">Status unavailable while the API is offline.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent assessments" action={<Link to="/history" className="text-sm font-medium text-blue-brand underline">View all</Link>} />
        <div className="py-3">
          {rows && rows.length > 0 ? <HistoryTable rows={rows.slice(0, 5)} /> : (
            <div className="px-5 pb-2"><EmptyState title="No assessments yet" action={<Link to="/assessment"><Button variant="secondary">Start the first assessment</Button></Link>}>Saved results appear here after you submit an assessment.</EmptyState></div>
          )}
        </div>
      </Card>
    </div>
  )
}
