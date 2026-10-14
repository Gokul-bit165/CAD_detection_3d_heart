import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardList, Database, HeartPulse, PlayCircle, PlugZap, Sparkles } from 'lucide-react'
import { useAppData } from '../../app/AppData'
import { ModelStatusBadge } from '../../app/AppShell'
import { Alert, Badge, Button, Card, CardHeader, EmptyState } from '../../components/ui'
import { api } from '../../services/api'
import type { PredictionSummary } from '../../types/api'
import HeartScene from '../heart-3d/LazyHeartScene'



const CASE_LABELS: Record<string, { title: string; tone: 'red' | 'amber' | 'teal'; tag: string }> = {
  'cad-triple-vessel': { title: 'Severe Triple-Vessel CAD', tone: 'red', tag: 'High Risk' },
  'cad-isolated-lad': { title: 'Critical LAD Stenosis', tone: 'red', tag: 'Anterior' },
  'cad-rca-ischemia': { title: 'Isolated RCA Stenosis', tone: 'amber', tag: 'Inferior' },
  'cad-low-risk-normal': { title: 'Low-Risk Non-Cardiac Chest Pain', tone: 'teal', tag: 'Normal' },
}

export function HistoryTable({ rows }: { rows: PredictionSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs text-navy-500">
          <tr>
            <th className="px-5 py-2.5 font-medium">Case / ID</th>
            <th className="font-medium">Clinical Profile</th>
            <th className="font-medium">Time</th>
            <th className="font-medium">Status</th>
            <th className="pr-5 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const meta = CASE_LABELS[r.id]
            return (
              <tr key={r.id} className="border-t border-line hover:bg-canvas/70 transition-colors">
                <td className="px-5 py-3 font-mono text-[13px] font-medium text-navy-900">{r.id}</td>
                <td>
                  {meta ? (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-navy-800 text-xs">{meta.title}</span>
                      <Badge tone={meta.tone}>{meta.tag}</Badge>
                    </div>
                  ) : <span className="text-xs text-navy-500">Patient Assessment</span>}
                </td>
                <td className="text-navy-700 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                <td><Badge tone={r.status === 'demo' ? 'amber' : r.status === 'ready' ? 'teal' : 'red'}>{r.status}</Badge></td>
                <td className="pr-5 text-right">
                  {r.has_results ? (
                    <Link className="inline-flex items-center gap-1 font-semibold text-blue-brand hover:underline text-xs" to={`/results/${r.id}`}>
                      View 3D <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : <span className="text-navy-500 text-xs">None</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card className="p-5 transition-all hover:shadow-md border-line/80">
      <div className="flex items-center gap-2 text-navy-500">{icon}<span className="text-xs font-semibold uppercase tracking-wider">{label}</span></div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-navy-900">{value}</div>
      {sub && <p className="mt-1 text-xs text-navy-500">{sub}</p>}
    </Card>
  )
}

const PRESET_CASES = [
  {
    id: 'cad-triple-vessel',
    title: 'Triple-Vessel Disease',
    subtitle: '67y Male · Severe Ischemia',
    badge: 'Critical (96%)',
    tone: 'red' as const,
    vessels: 'LAD 95% · LCX 91% · RCA 94%',
    desc: 'Typical angina, EF 35%, ST elevation, DM, HTN',
  },
  {
    id: 'cad-isolated-lad',
    title: 'Isolated LAD Stenosis',
    subtitle: '58y Male · Anterior Ischemia',
    badge: 'High Risk (91%)',
    tone: 'red' as const,
    vessels: 'LAD 92% · LCX 21% · RCA 18%',
    desc: 'RWMA, exertional angina, anterior lead changes',
  },
  {
    id: 'cad-low-risk-normal',
    title: 'Low-Risk / Normal',
    subtitle: '41y Female · Atypical Pain',
    badge: 'Normal (6%)',
    tone: 'teal' as const,
    vessels: 'All vessels < 10% risk',
    desc: 'Non-anginal symptoms, EF 64%, normal ECG & labs',
  },
]

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
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800 border border-teal-200">
              <Sparkles className="h-3 w-3" /> Multimodal AI Hackathon 2026 · Track A
            </span>
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-navy-900">CardioVista AI Diagnostics</h2>
          <p className="mt-1 max-w-2xl text-sm text-navy-500">Coronary artery disease & multi-vessel stenosis risk prediction with real-time interactive 3D digital twin visualization.</p>
        </div>
        <Link to="/assessment" className="ml-auto"><Button><ClipboardList className="h-4 w-4" /> New Patient Assessment</Button></Link>
      </div>

      {apiOnline === false && <Alert tone="error" title="Backend not reachable">Start the API (see README) — until then no assessments can be run.</Alert>}
      {modelInfo?.status === 'demo' && <Alert tone="warn" title="Research / Demo Mode Active">Simulated clinical engine is running with verified risk heuristics and realistic SHAP feature attributions.</Alert>}

      {/* Featured Clinical Scenarios */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-navy-700 flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-rose-600" /> Interactive Case Studies (Instant 3D Preview)
          </h3>
          <span className="text-xs text-navy-500">Click to view 3D heart & SHAP attributions</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {PRESET_CASES.map((c) => (
            <Link key={c.id} to={`/results/${c.id}`} className="group block">
              <Card className="p-4 transition-all duration-200 hover:shadow-lg hover:border-navy-900/40 relative overflow-hidden h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-navy-900 group-hover:text-blue-brand text-sm transition-colors">{c.title}</span>
                    <Badge tone={c.tone}>{c.badge}</Badge>
                  </div>
                  <p className="text-xs text-navy-500 mt-0.5">{c.subtitle}</p>
                  <p className="mt-2 text-xs font-mono font-medium text-navy-700 bg-canvas px-2.5 py-1 rounded-md border border-line">{c.vessels}</p>
                  <p className="mt-2 text-xs text-navy-500 line-clamp-2">{c.desc}</p>
                </div>
                <div className="mt-3 pt-3 border-t border-line/60 flex items-center justify-between text-xs font-semibold text-blue-brand group-hover:underline">
                  <span>Open 3D Twin</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<Database className="h-4 w-4" />} label="Recorded assessments" value={rows ? rows.length : '—'} sub="Stored securely on local database" />
        <Stat icon={<PlayCircle className="h-4 w-4" />} label="Prediction runs" value={rows ? demoRuns + modelRuns : '—'} sub={rows ? `${demoRuns} simulated · ${modelRuns} trained model` : undefined} />
        <Stat icon={<PlugZap className="h-4 w-4" />} label="Model engine" value={<ModelStatusBadge />} sub={modelInfo?.model_version ? `Version ${modelInfo.model_version}` : 'Clinical consensus engine'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader title="3D Heart Digital Twin" subtitle="Drag to rotate, scroll to zoom, click any coronary artery" action={<Link to="/explorer" className="text-sm font-semibold text-blue-brand hover:underline">Open full explorer</Link>} />
          <div className="p-3"><HeartScene compact className="h-[340px]" selected={null} onSelect={() => {}} /></div>
        </Card>
        <Card>
          <CardHeader title="CardioVista Architecture" subtitle="Dual-layer leakage safety & validation engine" />
          <div className="space-y-3 p-5 text-sm">
            {modelInfo ? (
              <>
                <p className="text-navy-700 leading-relaxed">{modelInfo.message}</p>
                <dl className="grid grid-cols-2 gap-3 text-[13px] bg-canvas p-3.5 rounded-xl border border-line">
                  <div><dt className="text-navy-500 text-xs">Prediction Provider</dt><dd className="font-semibold text-navy-900 mt-0.5">{modelInfo.provider}</dd></div>
                  <div><dt className="text-navy-500 text-xs">Input Features</dt><dd className="font-semibold text-navy-900 mt-0.5">{modelInfo.feature_count} validated</dd></div>
                  <div className="col-span-2"><dt className="text-navy-500 text-xs">Forbidden Leakage Targets</dt><dd className="font-medium text-navy-800 mt-0.5 font-mono text-xs">{modelInfo.excluded_inputs.slice(0, 4).join(', ')}</dd></div>
                </dl>
                <div className="flex items-center justify-between text-xs text-navy-600 pt-1">
                  <span>Model Evaluation: <strong>CV 5-Fold Available</strong></span>
                  <Link to="/evaluation" className="font-semibold text-blue-brand underline">View ROC curves & metrics</Link>
                </div>
              </>
            ) : <p className="text-navy-500">Status unavailable while the API is offline.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent assessments & cases" subtitle="Local audit trail of submitted clinical examinations" action={<Link to="/history" className="text-sm font-semibold text-blue-brand hover:underline">View all history</Link>} />
        <div className="py-2">
          {rows && rows.length > 0 ? <HistoryTable rows={rows.slice(0, 5)} /> : (
            <div className="px-5 pb-4"><EmptyState title="No assessments yet" action={<Link to="/assessment"><Button variant="secondary">Start the first assessment</Button></Link>}>Saved results appear here after you submit an assessment.</EmptyState></div>
          )}
        </div>
      </Card>
    </div>
  )
}

