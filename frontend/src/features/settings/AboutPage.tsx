import { useAppData } from '../../app/AppData'
import { DISCLAIMER } from '../../app/AppShell'
import { Alert, Card, CardHeader } from '../../components/ui'
import { MODEL_ATTRIBUTION } from '../heart-3d/vesselConfig'

export default function AboutPage() {
  const { health, modelInfo, schema } = useAppData()
  return (
    <div className="max-w-3xl space-y-5">
      <h2 className="font-display text-2xl font-semibold text-navy-900">Settings / About</h2>
      <Alert tone="warn" title="Research and educational prototype">{DISCLAIMER}</Alert>

      <Card>
        <CardHeader title="Connection" />
        <dl className="grid grid-cols-2 gap-3 p-5 text-sm">
          <div><dt className="text-xs text-navy-500">API base URL</dt><dd className="break-all font-mono text-[13px]">{(import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000/api/v1 (default)'}</dd></div>
          <div><dt className="text-xs text-navy-500">API version</dt><dd>{health?.api_version ?? 'offline'}</dd></div>
          <div><dt className="text-xs text-navy-500">Prediction provider</dt><dd>{modelInfo?.provider ?? '—'}</dd></div>
          <div><dt className="text-xs text-navy-500">Model status</dt><dd>{modelInfo?.status ?? '—'}</dd></div>
          <div className="col-span-2"><dt className="text-xs text-navy-500">Provider message</dt><dd>{modelInfo?.message ?? '—'}</dd></div>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Input data and leakage safeguards" />
        <div className="space-y-2 p-5 text-sm leading-relaxed text-navy-700">
          <p>{schema?.features.length ?? '—'} input features, taken from the Z-Alizadeh Sani feature dictionary. <strong>{schema?.excluded_inputs.slice(0, 4).join(', ')}</strong> are ground-truth angiography findings and are rejected by both the form and the API.</p>
          {schema?.unsupported_groups.map((u) => <p key={u.group} className="text-navy-500"><strong>{u.group}:</strong> {u.reason}</p>)}
        </div>
      </Card>

      <Card>
        <CardHeader title="3D model" />
        <div className="space-y-2 p-5 text-sm leading-relaxed text-navy-700">
          <p>{MODEL_ATTRIBUTION.description}</p>
          <p className="rounded-lg bg-amber-50 p-2 text-amber-950">{MODEL_ATTRIBUTION.licenceNote}</p>
          <ul className="list-disc pl-5">{MODEL_ATTRIBUTION.references.map((r) => <li key={r.url}><a className="text-blue-brand underline" href={r.url} target="_blank" rel="noreferrer">{r.label}</a></li>)}</ul>
        </div>
      </Card>
    </div>
  )
}
