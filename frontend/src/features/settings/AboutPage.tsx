import { useAppData } from '../../app/AppData'
import { DISCLAIMER } from '../../app/AppShell'
import { Alert, Card, CardHeader } from '../../components/ui'
import { MODEL_ATTRIBUTION } from '../heart-3d/vesselConfig'

export default function AboutPage() {
  const { health, modelInfo, schema } = useAppData()
  return (
    <div className="max-w-3xl space-y-5">
      <h2 className="text-2xl font-semibold text-ink">Settings & About</h2>
      <Alert tone="warn" title="Research and Educational Prototype">
        {DISCLAIMER}
      </Alert>

      <Card className="border border-line shadow-sm">
        <CardHeader title="System Connection" />
        <dl className="grid grid-cols-2 gap-3 p-5 text-sm">
          <div>
            <dt className="text-xs text-ink-3">API base URL</dt>
            <dd className="break-all font-mono text-[13px] text-ink font-medium">
              {(import.meta.env.VITE_API_BASE_URL as string | undefined) ??
                'http://localhost:8000/api/v1 (default)'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">API version</dt>
            <dd className="text-ink font-medium">{health?.api_version ?? 'offline'}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">Prediction provider</dt>
            <dd className="text-ink font-medium">{modelInfo?.provider ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">Model status</dt>
            <dd className="text-ink font-medium">{modelInfo?.status ?? '—'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-ink-3">Provider message</dt>
            <dd className="text-ink-2 mt-0.5">{modelInfo?.message ?? '—'}</dd>
          </div>
        </dl>
      </Card>

      <Card className="border border-line shadow-sm">
        <CardHeader title="Input Data & Leakage Safeguards" />
        <div className="space-y-2.5 p-5 text-sm leading-relaxed text-ink-2">
          <p>
            {schema?.features.length ?? '—'} input features, taken from the Z-Alizadeh Sani feature
            dictionary.{' '}
            <strong className="text-ink">
              {schema?.excluded_inputs.slice(0, 4).join(', ')}
            </strong>{' '}
            are ground-truth angiography findings and are strictly rejected by both the form and
            the API.
          </p>
          {schema?.unsupported_groups.map((u) => (
            <p key={u.group} className="text-xs text-ink-3">
              <strong className="text-ink-2">{u.group}:</strong> {u.reason}
            </p>
          ))}
        </div>
      </Card>

      <Card className="border border-line shadow-sm">
        <CardHeader title="3D Heart Anatomical Model" />
        <div className="space-y-3 p-5 text-sm leading-relaxed text-ink-2">
          <p>{MODEL_ATTRIBUTION.description}</p>
          <p className="rounded-xl bg-warn-soft p-3 text-ink text-xs leading-relaxed border border-warn/25">
            {MODEL_ATTRIBUTION.licenceNote}
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            {MODEL_ATTRIBUTION.references.map((r) => (
              <li key={r.url}>
                <a
                  className="text-accent font-semibold underline hover:opacity-80"
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  )
}