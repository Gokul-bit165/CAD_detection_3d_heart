import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, FileSpreadsheet, Play } from 'lucide-react'
import { Alert, Badge, Button, Card, cx } from '../../components/ui'
import { pct } from '../../lib/risk'
import { api, ApiError } from '../../services/api'
import type { ImportResponse, ImportRow, PredictionResponse } from '../../types/api'
import ImportSummary from './ImportSummary'

const DRAFT_KEY = 'cardiovista.assessment.draft'
type Result = { id: string; res: PredictionResponse } | { error: string }

/** Rank-based AUC (Mann-Whitney); null when only one class is present. */
function auc(scores: number[], labels: boolean[]): number | null {
  const pos = scores.filter((_, i) => labels[i])
  const neg = scores.filter((_, i) => !labels[i])
  if (!pos.length || !neg.length) return null
  let w = 0
  for (const p of pos) {
    for (const n of neg) {
      w += p > n ? 1 : p === n ? 0.5 : 0
    }
  }
  return w / (pos.length * neg.length)
}

function score(rows: ImportRow[], results: Record<number, Result>) {
  const pairs = rows.flatMap((r) => {
    const x = results[r.row]
    return x && 'res' in x && r.outcomes ? [{ out: r.outcomes, res: x.res }] : []
  })
  const cad = pairs.filter((p) => p.out.Cath !== undefined && p.res.overall?.probability != null)
  const tp = cad.filter((p) => p.out.Cath && p.res.overall!.predicted_class === 'positive').length
  const fn = cad.filter((p) => p.out.Cath && p.res.overall!.predicted_class !== 'positive').length
  const tn = cad.filter((p) => !p.out.Cath && p.res.overall!.predicted_class !== 'positive').length
  const fp = cad.filter((p) => !p.out.Cath && p.res.overall!.predicted_class === 'positive').length
  const vessel = (v: 'LAD' | 'LCX' | 'RCA') => {
    const q = pairs.filter((p) => p.out[v] !== undefined && p.res.vessels?.[v].probability != null)
    return auc(
      q.map((p) => p.res.vessels![v].probability!),
      q.map((p) => !!p.out[v])
    )
  }
  return {
    n: cad.length,
    tp,
    fn,
    tn,
    fp,
    acc: cad.length ? (tp + tn) / cad.length : null,
    sens: tp + fn ? tp / (tp + fn) : null,
    spec: tn + fp ? tn / (tn + fp) : null,
    auc: auc(
      cad.map((p) => p.res.overall!.probability!),
      cad.map((p) => !!p.out.Cath)
    ),
    vessels: { LAD: vessel('LAD'), LCX: vessel('LCX'), RCA: vessel('RCA') },
  }
}

const f2 = (v: number | null) => (v == null ? '—' : v.toFixed(2))
const cell = (v: unknown) => (v === null || v === undefined ? '' : String(v))

function toCsv(rows: ImportRow[], results: Record<number, Result>): string {
  const head = [
    'excel_row',
    'status',
    'CAD_probability',
    'CAD_class',
    'LAD',
    'LCX',
    'RCA',
    'prediction_id',
    'errors',
  ]
  const lines = rows.map((r) => {
    const x = results[r.row]
    const ok = x && 'res' in x ? x.res : null
    return [
      r.row,
      r.errors.length ? 'invalid' : ok ? 'predicted' : 'not run',
      ok?.overall?.probability ?? '',
      ok?.overall?.class_text ?? '',
      ok?.vessels?.LAD.probability ?? '',
      ok?.vessels?.LCX.probability ?? '',
      ok?.vessels?.RCA.probability ?? '',
      x && 'id' in x ? x.id : '',
      r.errors.join(' | ') || (x && 'error' in x ? x.error : ''),
    ]
      .map((c) => `"${cell(c).replace(/"/g, '""')}"`)
      .join(',')
  })
  return [head.join(','), ...lines].join('\n')
}

export default function ImportPage() {
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const [data, setData] = useState<ImportResponse | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<Record<number, Result>>({})
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const upload = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setData(null)
    setResults({})
    setFileName(file.name)
    setBusy(true)
    try {
      setData(await api.importFile(file))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Upload failed.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const valid = data?.rows.filter((r) => r.features && !r.errors.length) ?? []

  const predictAll = async () => {
    setProgress({ done: 0, total: valid.length })
    const next: Record<number, Result> = {}
    for (const [i, r] of valid.entries()) {
      try {
        const res = await api.createPrediction(r.features!)
        next[r.row] =
          res.status === 'unavailable' || !res.id
            ? { error: res.message ?? 'Prediction unavailable' }
            : { id: res.id, res }
      } catch (e) {
        next[r.row] = { error: e instanceof ApiError ? e.message : 'Request failed' }
      }
      setResults({ ...next })
      setProgress({ done: i + 1, total: valid.length })
    }
    setProgress(null)
  }

  const openInForm = (r: ImportRow) => {
    try {
      const draft = Object.fromEntries(
        Object.entries(r.features ?? {})
          .filter(([k]) => k !== 'BMI')
          .map(([k, v]) => [k, v ?? ''])
      )
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // Private mode
    }
    navigate('/assessment')
  }

  const download = () => {
    if (!data) return
    const url = URL.createObjectURL(new Blob([toCsv(data.rows, results)], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: 'cardiovista_batch_results.csv',
    })
    a.click()
    URL.revokeObjectURL(url)
  }

  const predicted = Object.values(results).filter((x) => 'res' in x).length
  const sc = score(data?.rows ?? [], results)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Batch Import Patients</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-3">
            Upload a .csv or .xlsx with one patient per row and dataset column names in the header (up to 500 rows). Every row is
            validated identically to the individual assessment form. Outcome columns such as Cath, LAD, LCX, and RCA are excluded to prevent target leakage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={api.templateCsvUrl} download="cardiovista_template.csv">
            <Button variant="secondary" className="text-xs">
              <Download className="h-3.5 w-3.5 text-accent" /> CSV template
            </Button>
          </a>
          <a href={api.templateUrl} download="cardiovista_template.xlsx">
            <Button variant="secondary" className="text-xs">
              <Download className="h-3.5 w-3.5 text-accent" /> Excel template
            </Button>
          </a>
        </div>
      </div>

      <Card className="p-6 border border-line">
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            void upload(e.dataTransfer.files[0])
          }}
          className={cx(
            'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-surface-2/40 px-6 py-10 text-center transition-colors hover:border-accent hover:bg-surface-2',
            busy && 'opacity-60 cursor-wait'
          )}
        >
          <FileSpreadsheet className="h-8 w-8 text-accent" aria-hidden />
          <span className="text-sm font-semibold text-ink">
            {busy ? 'Reading and validating file...' : 'Drop a .csv or .xlsx here or click to choose'}
          </span>
          <span className="text-xs text-ink-3">Max 5 MB. Data stays on your machine and the local API.</span>
          <input
            ref={input}
            type="file"
            accept=".csv,.xlsx"
            className="sr-only"
            disabled={busy}
            onChange={(e) => void upload(e.target.files?.[0])}
          />
        </label>
      </Card>

      {error && <Alert tone="error" title="Could not import this file">{error}</Alert>}

      {data && (
        <>
          <ImportSummary data={data} fileName={fileName} />

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={() => void predictAll()}
              loading={!!progress}
              disabled={!valid.length || !!progress}
            >
              <Play className="h-4 w-4" />{' '}
              {progress
                ? `Predicting ${progress.done}/${progress.total}`
                : `Predict ${valid.length} valid rows`}
            </Button>
            {predicted > 0 && (
              <Button variant="secondary" onClick={download}>
                <Download className="h-4 w-4 text-accent" /> Download results (CSV)
              </Button>
            )}
            <span className="text-xs text-ink-3">All completed predictions are stored in History.</span>
          </div>

          {sc.n > 0 && (
            <Card className="p-5 border border-line">
              <h3 className="text-sm font-semibold text-ink">
                Scored against known outcomes in the file ({sc.n} patients)
              </h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                {[
                  ['Accuracy', sc.acc],
                  ['Sensitivity', sc.sens],
                  ['Specificity', sc.spec],
                  ['ROC-AUC', sc.auc],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-xl bg-surface-2 p-2.5">
                    <dt className="text-xs text-ink-3 font-medium">CAD {k as string}</dt>
                    <dd className="text-xl font-bold text-ink mt-0.5">{f2(v as number | null)}</dd>
                  </div>
                ))}
                <div className="rounded-xl bg-surface-2 p-2.5">
                  <dt className="text-xs text-ink-3 font-medium">TP / FN / TN / FP</dt>
                  <dd className="text-xl font-bold text-ink mt-0.5">
                    {sc.tp} / {sc.fn} / {sc.tn} / {sc.fp}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-ink-3 leading-relaxed">
                Vessel ROC-AUC: LAD {f2(sc.vessels.LAD)} • LCX {f2(sc.vessels.LCX)} • RCA{' '}
                {f2(sc.vessels.RCA)}. LCX and RCA are weaker models, so lower metrics there are expected.
              </p>
            </Card>
          )}

          <Card className="overflow-x-auto py-2 border border-line">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead className="text-xs uppercase tracking-wider text-ink-3 border-b border-line">
                <tr>
                  {[
                    'Row',
                    'Age',
                    'Sex',
                    'Status',
                    'CAD',
                    'Actual',
                    'LAD',
                    'LCX',
                    'RCA',
                    '',
                  ].map((h) => (
                    <th key={h} className="px-4 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {data.rows.map((r) => {
                  const x = results[r.row]
                  const res = x && 'res' in x ? x.res : null
                  return (
                    <tr key={r.row} className="hover:bg-surface-2/40 transition-colors align-top">
                      <td className="px-4 py-2 font-mono text-ink-3">{r.row}</td>
                      <td className="px-4 py-2 text-ink">{cell(r.features?.Age)}</td>
                      <td className="px-4 py-2 text-ink">{cell(r.features?.Sex)}</td>
                      <td className="px-4 py-2">
                        {r.errors.length ? (
                          <ul className="list-disc pl-4 text-danger text-xs">
                            {r.errors.map((e) => (
                              <li key={e}>{e}</li>
                            ))}
                          </ul>
                        ) : x && 'error' in x ? (
                          <span className="text-danger text-xs">{x.error}</span>
                        ) : res ? (
                          <Badge tone={res.overall?.predicted_class === 'positive' ? 'red' : 'teal'}>
                            {res.overall?.class_text}
                          </Badge>
                        ) : (
                          <Badge>ready</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 font-semibold text-ink font-mono">
                        {res ? pct(res.overall?.probability) : ''}
                      </td>
                      <td className="px-4 py-2">
                        {r.outcomes?.Cath === undefined ? (
                          ''
                        ) : (
                          <span
                            className={
                              res
                                ? (res.overall?.predicted_class === 'positive') === r.outcomes.Cath
                                  ? 'text-ok font-semibold'
                                  : 'text-danger font-semibold'
                                : 'text-ink-3'
                            }
                          >
                            {r.outcomes.Cath ? 'CAD' : 'Normal'}
                            {res
                              ? (res.overall?.predicted_class === 'positive') === r.outcomes.Cath
                                ? ' ✓'
                                : ' ✗'
                              : ''}
                          </span>
                        )}
                      </td>
                      {(['LAD', 'LCX', 'RCA'] as const).map((v) => (
                        <td key={v} className="px-4 py-2 text-ink-2 font-mono">
                          {res ? pct(res.vessels?.[v].probability) : ''}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-4 py-2 text-right space-x-3">
                        {x && 'id' in x && (
                          <Link className="text-accent font-semibold hover:underline" to={`/results/${x.id}`}>
                            Open report
                          </Link>
                        )}
                        {r.features && (
                          <button
                            type="button"
                            className="text-ink-2 font-medium hover:text-ink hover:underline"
                            onClick={() => openInForm(r)}
                          >
                            Edit in form
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}