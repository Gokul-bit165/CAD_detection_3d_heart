import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, FileSpreadsheet, Play, Upload } from 'lucide-react'
import { Alert, Badge, Button, Card, cx } from '../../components/ui'
import { pct } from '../../lib/risk'
import { api, ApiError } from '../../services/api'
import type { ImportResponse, ImportRow, PredictionResponse } from '../../types/api'

const DRAFT_KEY = 'cardiovista.assessment.draft'
type Result = { id: string; res: PredictionResponse } | { error: string }

/** Rank-based AUC (Mann-Whitney); null when only one class is present. */
function auc(scores: number[], labels: boolean[]): number | null {
  const pos = scores.filter((_, i) => labels[i]), neg = scores.filter((_, i) => !labels[i])
  if (!pos.length || !neg.length) return null
  let w = 0
  for (const p of pos) for (const n of neg) w += p > n ? 1 : p === n ? 0.5 : 0
  return w / (pos.length * neg.length)
}

function score(rows: ImportRow[], results: Record<number, Result>) {
  const pairs = rows.flatMap((r) => { const x = results[r.row]; return x && 'res' in x && r.outcomes ? [{ out: r.outcomes, res: x.res }] : [] })
  const cad = pairs.filter((p) => p.out.Cath !== undefined && p.res.overall?.probability != null)
  const tp = cad.filter((p) => p.out.Cath && p.res.overall!.predicted_class === 'positive').length
  const fn = cad.filter((p) => p.out.Cath && p.res.overall!.predicted_class !== 'positive').length
  const tn = cad.filter((p) => !p.out.Cath && p.res.overall!.predicted_class !== 'positive').length
  const fp = cad.filter((p) => !p.out.Cath && p.res.overall!.predicted_class === 'positive').length
  const vessel = (v: 'LAD' | 'LCX' | 'RCA') => {
    const q = pairs.filter((p) => p.out[v] !== undefined && p.res.vessels?.[v].probability != null)
    return auc(q.map((p) => p.res.vessels![v].probability!), q.map((p) => !!p.out[v]))
  }
  return {
    n: cad.length, tp, fn, tn, fp,
    acc: cad.length ? (tp + tn) / cad.length : null, sens: tp + fn ? tp / (tp + fn) : null, spec: tn + fp ? tn / (tn + fp) : null,
    auc: auc(cad.map((p) => p.res.overall!.probability!), cad.map((p) => !!p.out.Cath)),
    vessels: { LAD: vessel('LAD'), LCX: vessel('LCX'), RCA: vessel('RCA') },
  }
}

const f2 = (v: number | null) => (v == null ? '—' : v.toFixed(2))
const cell = (v: unknown) => (v === null || v === undefined ? '' : String(v))

function toCsv(rows: ImportRow[], results: Record<number, Result>): string {
  const head = ['excel_row', 'status', 'CAD_probability', 'CAD_class', 'LAD', 'LCX', 'RCA', 'prediction_id', 'errors']
  const lines = rows.map((r) => {
    const x = results[r.row]
    const ok = x && 'res' in x ? x.res : null
    return [r.row, r.errors.length ? 'invalid' : ok ? 'predicted' : 'not run', ok?.overall?.probability ?? '', ok?.overall?.class_text ?? '',
      ok?.vessels?.LAD.probability ?? '', ok?.vessels?.LCX.probability ?? '', ok?.vessels?.RCA.probability ?? '',
      x && 'id' in x ? x.id : '', r.errors.join(' | ') || (x && 'error' in x ? x.error : '')]
      .map((c) => `"${cell(c).replace(/"/g, '""')}"`).join(',')
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
    setError(null); setData(null); setResults({}); setFileName(file.name); setBusy(true)
    try { setData(await api.importExcel(file)) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Upload failed.') }
    finally { setBusy(false); if (input.current) input.current.value = '' }
  }

  const valid = data?.rows.filter((r) => r.features && !r.errors.length) ?? []
  const invalid = (data?.rows.length ?? 0) - valid.length

  const predictAll = async () => {
    setProgress({ done: 0, total: valid.length })
    const next: Record<number, Result> = {}
    for (const [i, r] of valid.entries()) {
      try {
        const res = await api.createPrediction(r.features!)
        next[r.row] = res.status === 'unavailable' || !res.id ? { error: res.message ?? 'Prediction unavailable' } : { id: res.id, res }
      } catch (e) { next[r.row] = { error: e instanceof ApiError ? e.message : 'Request failed' } }
      setResults({ ...next }); setProgress({ done: i + 1, total: valid.length })
    }
    setProgress(null)
  }

  const openInForm = (r: ImportRow) => {
    try {
      const draft = Object.fromEntries(Object.entries(r.features ?? {}).filter(([k]) => k !== 'BMI').map(([k, v]) => [k, v ?? '']))
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch { /* private mode: the form just opens empty */ }
    navigate('/assessment')
  }

  const download = () => {
    if (!data) return
    const url = URL.createObjectURL(new Blob([toCsv(data.rows, results)], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'cardiovista_batch_results.csv' })
    a.click(); URL.revokeObjectURL(url)
  }

  const predicted = Object.values(results).filter((x) => 'res' in x).length
  const sc = score(data?.rows ?? [], results)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-navy-900">Import patients from Excel</h2>
          <p className="mt-1 max-w-2xl text-sm text-navy-500">
            Upload an .xlsx with one patient per row and the dataset column names in the header (up to 500 rows). Every row is
            validated exactly like the form. Outcome columns such as Cath, LAD, LCX and RCA are ignored, never used as inputs.
          </p>
        </div>
        <a className="ml-auto" href={api.templateUrl}><Button variant="secondary"><Download className="h-4 w-4" /> Download template</Button></a>
      </div>

      <Card className="p-6">
        <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void upload(e.dataTransfer.files[0]) }}
          className={cx('flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line px-6 py-10 text-center transition-colors hover:border-navy-500', busy && 'opacity-60')}>
          <FileSpreadsheet className="h-8 w-8 text-teal-600" aria-hidden />
          <span className="text-sm font-medium text-navy-900">{busy ? 'Reading file…' : 'Drop an .xlsx here or click to choose'}</span>
          <span className="text-xs text-navy-500">Max 5 MB. Data stays on your machine and the local API.</span>
          <input ref={input} type="file" accept=".xlsx" className="sr-only" disabled={busy} onChange={(e) => void upload(e.target.files?.[0])} />
        </label>
      </Card>

      {error && <Alert tone="error" title="Could not import this file">{error}</Alert>}

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone="blue"><Upload className="h-3 w-3" /> {fileName} · sheet “{data.sheet}”</Badge>
            <Badge tone="teal">{valid.length} valid</Badge>
            {invalid > 0 && <Badge tone="red">{invalid} with errors</Badge>}
          </div>
          {data.ignored_outcome_columns.length > 0 && (
            <Alert tone="info" title="Outcome columns ignored">
              {data.ignored_outcome_columns.join(', ')} {data.ignored_outcome_columns.length > 1 ? 'were' : 'was'} found in the file and deliberately not used (target leakage). They are never given to the model; if present they are only used to score the predictions afterwards.
            </Alert>
          )}
          {data.ignored_unknown_columns.length > 0 && <Alert tone="warn" title="Unrecognised columns ignored">{data.ignored_unknown_columns.join(', ')}</Alert>}
          {data.missing_columns.length > 0 && (
            <Alert tone="warn" title={`${data.missing_columns.length} columns missing`}>
              Blank optional values are filled with training-set medians: {data.missing_columns.join(', ')}.
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void predictAll()} loading={!!progress} disabled={!valid.length || !!progress}>
              <Play className="h-4 w-4" /> {progress ? `Predicting ${progress.done}/${progress.total}` : `Predict ${valid.length} valid rows`}
            </Button>
            {predicted > 0 && <Button variant="secondary" onClick={download}><Download className="h-4 w-4" /> Download results (CSV)</Button>}
            <span className="text-xs text-navy-500">Each prediction is saved to Prediction History.</span>
          </div>

          {sc.n > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-navy-900">Scored against the known outcomes in the file ({sc.n} patients)</h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                {[['Accuracy', sc.acc], ['Sensitivity', sc.sens], ['Specificity', sc.spec], ['ROC-AUC', sc.auc]].map(([k, v]) => (
                  <div key={k as string}><dt className="text-xs text-navy-500">CAD {k as string}</dt><dd className="text-xl font-semibold text-navy-900">{f2(v as number | null)}</dd></div>
                ))}
                <div><dt className="text-xs text-navy-500">TP / FN / TN / FP</dt><dd className="text-xl font-semibold text-navy-900">{sc.tp} / {sc.fn} / {sc.tn} / {sc.fp}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-navy-500">
                Vessel ROC-AUC: LAD {f2(sc.vessels.LAD)} · LCX {f2(sc.vessels.LCX)} · RCA {f2(sc.vessels.RCA)}. LCX and RCA are weak models, so low values there are expected.
                These numbers are only meaningful for patients the model never trained on (the supplied test workbook contains only such patients).
              </p>
            </Card>
          )}

          <Card className="overflow-x-auto py-2">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead className="text-xs uppercase tracking-wider text-navy-500">
                <tr>{['Row', 'Age', 'Sex', 'Status', 'CAD', 'Actual', 'LAD', 'LCX', 'RCA', ''].map((h) => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.rows.map((r) => {
                  const x = results[r.row]
                  const res = x && 'res' in x ? x.res : null
                  return (
                    <tr key={r.row} className="border-t border-line/70 align-top">
                      <td className="px-4 py-2 font-mono text-navy-500">{r.row}</td>
                      <td className="px-4 py-2">{cell(r.features?.Age)}</td>
                      <td className="px-4 py-2">{cell(r.features?.Sex)}</td>
                      <td className="px-4 py-2">
                        {r.errors.length ? <ul className="list-disc pl-4 text-red-700">{r.errors.map((e) => <li key={e}>{e}</li>)}</ul>
                          : x && 'error' in x ? <span className="text-red-700">{x.error}</span>
                          : res ? <Badge tone={res.overall?.predicted_class === 'positive' ? 'red' : 'teal'}>{res.overall?.class_text}</Badge>
                          : <Badge>ready</Badge>}
                      </td>
                      <td className="px-4 py-2 font-semibold">{res ? pct(res.overall?.probability) : ''}</td>
                      <td className="px-4 py-2">
                        {r.outcomes?.Cath === undefined ? '' : (
                          <span className={res ? ((res.overall?.predicted_class === 'positive') === r.outcomes.Cath ? 'text-teal-700' : 'text-red-700') : 'text-navy-500'}>
                            {r.outcomes.Cath ? 'CAD' : 'Normal'}{res ? ((res.overall?.predicted_class === 'positive') === r.outcomes.Cath ? ' ✓' : ' ✗') : ''}
                          </span>
                        )}
                      </td>
                      {(['LAD', 'LCX', 'RCA'] as const).map((v) => <td key={v} className="px-4 py-2 text-navy-700">{res ? pct(res.vessels?.[v].probability) : ''}</td>)}
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        {x && 'id' in x && <Link className="mr-3 text-blue-brand underline" to={`/results/${x.id}`}>Open result</Link>}
                        {r.features && <button className="text-blue-brand underline" onClick={() => openInForm(r)}>Edit in form</button>}
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
