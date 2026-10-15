import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Download, Edit3, FileSpreadsheet, Loader2, Play, UserCheck } from 'lucide-react'
import { Alert, Badge, Button, Card, cx } from '../../components/ui'
import { api, ApiError } from '../../services/api'
import type { ImportResponse, ImportRow } from '../../types/api'
import ImportSummary from '../import/ImportSummary'

const DRAFT_KEY = 'cardiovista.assessment.draft'

interface UploadTabProps {
  onSwitchToManual: () => void
}

export default function UploadTab({ onSwitchToManual }: UploadTabProps) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [busy, setBusy] = useState(false)
  const [data, setData] = useState<ImportResponse | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [assessingRow, setAssessingRow] = useState<number | null>(null)
  const [assessError, setAssessError] = useState<string | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setAssessError(null)

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. The maximum allowed file size is 5 MB.')
      return
    }

    // Check extension
    const name = file.name.toLowerCase()
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
      setError('Unsupported file type. Please upload a .csv or .xlsx patient spreadsheet.')
      return
    }

    setFileName(file.name)
    setBusy(true)
    setData(null)

    try {
      const res = await api.importFile(file)
      setData(res)
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message)
      } else {
        setError('Failed to upload and validate spreadsheet. The server may be unreachable.')
      }
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const runSingleAssessment = async (row: ImportRow) => {
    if (!row.features) return
    setAssessingRow(row.row)
    setAssessError(null)

    try {
      const res = await api.createPrediction(row.features)
      if (res.status === 'unavailable' || !res.id) {
        setAssessError(res.message ?? 'Model estimate could not be produced for this patient.')
        setAssessingRow(null)
        return
      }
      navigate(`/results/${res.id}`)
    } catch (e) {
      setAssessError(e instanceof ApiError ? e.message : 'Assessment request failed. Check server connection.')
      setAssessingRow(null)
    }
  }

  const editInForm = (row: ImportRow) => {
    if (!row.features) return
    try {
      const draft = Object.fromEntries(
        Object.entries(row.features)
          .filter(([k]) => k !== 'BMI')
          .map(([k, v]) => [k, v ?? ''])
      )
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // Ignore private mode sessionStorage errors
    }
    onSwitchToManual()
  }

  const validRows = data?.rows.filter((r) => r.features && !r.errors.length) ?? []
  const singleRow = validRows.length === 1 && data?.rows.length === 1 ? validRows[0] : null
  const hasMultipleRows = (data?.rows.length ?? 0) > 1 || (data?.rows.length === 1 && !singleRow)

  return (
    <div className="space-y-5">
      {/* Top action cards & Template downloads */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div>
          <h3 className="text-base font-semibold text-ink">Upload Patient Data Sheet</h3>
          <p className="text-xs text-ink-3">
            Upload a single-patient or cohort sheet in .csv or .xlsx format with clinical measurements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={api.templateCsvUrl} download="cardiovista_template.csv">
            <Button variant="secondary" className="text-xs py-1.5 px-3">
              <Download className="h-3.5 w-3.5 text-accent" /> Download CSV template
            </Button>
          </a>
          <a href={api.templateUrl} download="cardiovista_template.xlsx">
            <Button variant="secondary" className="text-xs py-1.5 px-3">
              <Download className="h-3.5 w-3.5 text-accent" /> Download Excel template
            </Button>
          </a>
        </div>
      </div>

      {/* Upload Drop Zone */}
      <Card className="p-6">
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            void handleFile(e.dataTransfer.files[0])
          }}
          className={cx(
            'flex cursor-pointer flex-col items-center gap-2.5 rounded-2xl border-2 border-dashed border-line bg-surface-2/40 px-6 py-10 text-center transition-all hover:border-accent hover:bg-surface-2',
            busy && 'opacity-60 cursor-wait'
          )}
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-surface text-accent shadow-xs border border-line">
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            ) : (
              <FileSpreadsheet className="h-6 w-6 text-accent" />
            )}
          </div>
          <span className="text-sm font-semibold text-ink">
            {busy ? 'Validating spreadsheet rows...' : 'Drop a .csv or .xlsx file here or click to choose'}
          </span>
          <span className="text-xs text-ink-3 max-w-sm">
            Max 5 MB. All calculations remain strictly on your machine and local server.
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="sr-only"
            disabled={busy}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </label>
      </Card>

      {error && <Alert tone="error" title="Import Error">{error}</Alert>}
      {assessError && <Alert tone="error" title="Assessment Failed">{assessError}</Alert>}

      {/* Upload Summary & Validation Results */}
      {data && (
        <div className="space-y-4">
          <ImportSummary data={data} fileName={fileName} />

          {/* Scenario 1: Exactly one valid row -> Patient Preview Card */}
          {singleRow && singleRow.features && (
            <Card className="p-5 border border-line shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-line/60">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-accent" />
                  <div>
                    <h4 className="text-sm font-semibold text-ink">Patient Preview Ready</h4>
                    <p className="text-xs text-ink-3">Single-patient record validated successfully</p>
                  </div>
                </div>
                <Badge tone="teal">Row {singleRow.row} valid</Badge>
              </div>

              {/* Key vitals preview grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl bg-surface-2 p-2.5">
                  <span className="text-[10px] uppercase font-semibold text-ink-3">Age / Sex</span>
                  <div className="text-sm font-bold text-ink mt-0.5">
                    {String(singleRow.features['Age'] ?? '—')} / {String(singleRow.features['Sex'] ?? '—')}
                  </div>
                </div>
                <div className="rounded-xl bg-surface-2 p-2.5">
                  <span className="text-[10px] uppercase font-semibold text-ink-3">Blood Pressure</span>
                  <div className="text-sm font-bold text-ink mt-0.5">
                    {String(singleRow.features['BP'] ?? '—')} mmHg
                  </div>
                </div>
                <div className="rounded-xl bg-surface-2 p-2.5">
                  <span className="text-[10px] uppercase font-semibold text-ink-3">Fasting Glucose</span>
                  <div className="text-sm font-bold text-ink mt-0.5">
                    {String(singleRow.features['FBS'] ?? '—')} mg/dL
                  </div>
                </div>
                <div className="rounded-xl bg-surface-2 p-2.5">
                  <span className="text-[10px] uppercase font-semibold text-ink-3">Ejection Fraction</span>
                  <div className="text-sm font-bold text-ink mt-0.5">
                    {String(singleRow.features['EF-TTE'] ?? '—')}%
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  loading={assessingRow === singleRow.row}
                  onClick={() => void runSingleAssessment(singleRow)}
                  className="px-5 py-2.5"
                >
                  <Play className="h-4 w-4" /> Run Assessment & Open 3D Report
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => editInForm(singleRow)}
                >
                  <Edit3 className="h-4 w-4" /> Edit Values in Form
                </Button>
              </div>
            </Card>
          )}

          {/* Scenario 2: Multiple rows -> Patient Row Picker */}
          {hasMultipleRows && (
            <Card className="overflow-hidden border border-line shadow-sm">
              <div className="p-4 border-b border-line/60 bg-surface-2/40 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-ink">Select a Patient to Assess</h4>
                  <p className="text-xs text-ink-3">
                    Found {data.rows.length} rows in this spreadsheet. Choose an individual row or run the whole cohort.
                  </p>
                </div>
                <Link to="/import" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
                  Run all in Batch Import <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-surface border-b border-line text-ink-3">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Row</th>
                      <th className="px-4 py-2.5 font-semibold">Age</th>
                      <th className="px-4 py-2.5 font-semibold">Sex</th>
                      <th className="px-4 py-2.5 font-semibold">BP</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {data.rows.map((r) => {
                      const isValid = !r.errors.length && r.features
                      const isRunning = assessingRow === r.row

                      return (
                        <tr key={r.row} className="hover:bg-surface-2/50 transition-colors">
                          <td className="px-4 py-2.5 font-mono font-medium text-ink">#{r.row}</td>
                          <td className="px-4 py-2.5 text-ink-2">{String(r.features?.['Age'] ?? '—')}</td>
                          <td className="px-4 py-2.5 text-ink-2">{String(r.features?.['Sex'] ?? '—')}</td>
                          <td className="px-4 py-2.5 text-ink-2">{String(r.features?.['BP'] ?? '—')}</td>
                          <td className="px-4 py-2.5">
                            {isValid ? (
                              <Badge tone="teal">Ready</Badge>
                            ) : (
                              <span
                                className="text-[11px] text-danger font-medium cursor-help"
                                title={r.errors.join('; ')}
                              >
                                {r.errors[0] || 'Invalid'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right space-x-2">
                            {isValid && (
                              <>
                                <Button
                                  variant="primary"
                                  loading={isRunning}
                                  disabled={assessingRow !== null}
                                  onClick={() => void runSingleAssessment(r)}
                                  className="py-1 px-2.5 text-xs"
                                >
                                  Assess
                                </Button>
                                <Button
                                  variant="secondary"
                                  onClick={() => editInForm(r)}
                                  className="py-1 px-2.5 text-xs"
                                >
                                  Edit
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-surface-2/40 border-t border-line/60 flex items-center justify-between text-xs text-ink-3">
                <span>Total records: {data.rows.length}</span>
                <Link to="/import" className="font-medium text-accent hover:underline">
                  Switch to Batch Import for full cohort metrics →
                </Link>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}