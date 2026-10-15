import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ClipboardEdit, FileSpreadsheet, FlaskConical, RotateCcw, Send } from 'lucide-react'
import { useAppData } from '../../app/AppData'
import { Alert, Badge, Button, Card, Spinner } from '../../components/ui'
import { api, ApiError } from '../../services/api'
import type { FeatureSpec, FeatureValue, FeatureValues } from '../../types/api'
import { displayValue } from '../predictions/InputSummary'
import FieldControl from './FieldControl'
import { bmiOf, defaults, EXAMPLE_VALUES, toPayload, validateField } from './validation'
import UploadTab from './UploadTab'

const STORAGE_KEY = 'cardiovista.assessment.draft'

function loadDraft(): FeatureValues | null {
  try {
    const s = sessionStorage.getItem(STORAGE_KEY)
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}

function saveDraft(v: FeatureValues) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v))
  } catch {
    // Private mode
  }
}

export default function AssessmentPage() {
  const { schema, schemaError, apiOnline } = useAppData()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = searchParams.get('tab') === 'upload' ? 'upload' : 'manual'
  const setTab = (tab: 'manual' | 'upload') => {
    setSearchParams({ tab })
  }

  const [values, setValues] = useState<FeatureValues | null>(null)
  const [step, setStep] = useState(0)
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<{ message: string; problems: string[] } | null>(null)
  const [isExample, setIsExample] = useState(false)

  useEffect(() => {
    if (schema && !values) setValues({ ...defaults(schema), ...(loadDraft() ?? {}) })
  }, [schema, values])

  useEffect(() => {
    if (values) saveDraft(values)
  }, [values])

  const groups = useMemo(
    () =>
      schema
        ? Object.entries(schema.groups).filter(([g]) => schema.features.some((f) => f.group === g))
        : [],
    [schema]
  )
  const reviewStep = groups.length

  if (schemaError) {
    return <Alert tone="error" title="Could not load assessment form">{schemaError}</Alert>
  }
  if (apiOnline === false) {
    return (
      <Alert tone="error" title="API offline">
        The assessment form is generated from the backend feature schema. Start the backend (see README) and reload.
      </Alert>
    )
  }
  if (!schema || !values) {
    return <Spinner label="Loading clinical assessment form" />
  }

  const bmi = bmiOf(values)
  const set = (name: string, v: FeatureValue) => {
    setValues({ ...values, [name]: v })
    setIsExample(false)
  }
  const touch = (name: string) => setTouched((t) => new Set(t).add(name))
  const issueOf = (f: FeatureSpec) => validateField(f, values[f.name])
  const stepErrors = (g: string) =>
    schema.features.filter((f) => f.group === g && issueOf(f)?.level === 'error')
  const allErrors = schema.features.filter((f) => issueOf(f)?.level === 'error')
  const warnings = schema.features.filter((f) => issueOf(f)?.level === 'warning')

  const goNext = () => {
    const errs = stepErrors(groups[step][0])
    if (errs.length) {
      setTouched((t) => new Set([...t, ...errs.map((e) => e.name)]))
      return
    }
    setStep(step + 1)
  }

  const reset = () => {
    setValues(defaults(schema))
    setTouched(new Set())
    setStep(0)
    setError(null)
    setIsExample(false)
  }

  const loadExample = () => {
    setValues({ ...defaults(schema), ...EXAMPLE_VALUES })
    setIsExample(true)
    setError(null)
  }

  const submit = async () => {
    if (allErrors.length) {
      setTouched(new Set(allErrors.map((e) => e.name)))
      setStep(groups.findIndex(([g]) => g === allErrors[0].group))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const r = await api.createPrediction(toPayload(schema, values))
      if (r.status === 'unavailable' || !r.id) {
        setError({ message: r.message ?? 'Prediction unavailable', problems: [] })
        setSubmitting(false)
        return
      }
      navigate('/results/' + r.id)
    } catch (e) {
      setSubmitting(false)
      setError({
        message: e instanceof ApiError ? e.message : 'Assessment request failed.',
        problems: [],
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and top tab buttons */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-2 border-b border-line/60">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">New Patient Assessment</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-3">
            Enter clinical measurements to produce an estimated risk score and 3D coronary reconstruction.
          </p>
        </div>

        {/* Tab Switcher */}
        <div role="tablist" aria-label="Assessment entry methods" className="flex items-center gap-1.5 p-1 bg-surface-2 rounded-xl border border-line">
          <button
            role="tab"
            aria-selected={activeTab === 'manual'}
            onClick={() => setTab('manual')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'manual'
                ? 'bg-surface text-ink shadow-xs border border-line/60'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            <ClipboardEdit className="h-3.5 w-3.5 text-accent" />
            <span>Enter manually</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'upload'}
            onClick={() => setTab('upload')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-surface text-ink shadow-xs border border-line/60'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-accent" />
            <span>Upload CSV / Excel</span>
          </button>
        </div>
      </div>

      {activeTab === 'upload' ? (
        <UploadTab onSwitchToManual={() => setTab('manual')} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-3">
              Ground-truth catheterization fields ({schema.excluded_inputs.slice(0, 4).join(', ')}) are prohibited to prevent target leakage.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={loadExample} className="text-xs py-1.5 px-3">
                <FlaskConical className="h-3.5 w-3.5 text-accent" /> Load example values
              </Button>
              <Button variant="ghost" onClick={reset} className="text-xs py-1.5 px-3">
                <RotateCcw className="h-3.5 w-3.5" /> Reset form
              </Button>
            </div>
          </div>

          {isExample && (
            <Alert tone="info" title="Synthetic Example Loaded">
              These values are synthetic for testing and demonstration purposes.
            </Alert>
          )}

          {/* Stepper navigation */}
          <nav aria-label="Assessment steps" className="flex gap-1.5 overflow-x-auto pb-1">
            {[...groups.map(([, l]) => l), 'Review'].map((label, i) => {
              const done = i < step
              const cur = i === step
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => (i <= step || i === reviewStep ? setStep(i) : undefined)}
                  aria-current={cur ? 'step' : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    cur
                      ? 'bg-ink text-surface shadow-xs'
                      : done
                      ? 'bg-accent-soft text-accent'
                      : 'bg-surface text-ink-3 border border-line hover:bg-surface-2'
                  }`}
                >
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-surface-2 text-[10px]">
                    {done ? <Check className="h-3 w-3 text-accent" /> : i + 1}
                  </span>
                  {label}
                </button>
              )
            })}
          </nav>

          <Card className="p-5 sm:p-6 border border-line shadow-sm">
            {step < reviewStep ? (
              <fieldset>
                <legend className="mb-4 text-base font-semibold text-ink">
                  {groups[step][1]}
                </legend>
                <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                  {schema.features
                    .filter((f) => f.group === groups[step][0])
                    .map((f) => (
                      <FieldControl
                        key={f.name}
                        spec={f}
                        value={values[f.name]}
                        issue={issueOf(f)}
                        touched={touched.has(f.name)}
                        readOnlyValue={
                          f.derived
                            ? bmi != null
                              ? `${bmi} kg/m²`
                              : 'Enter weight and height'
                            : undefined
                        }
                        onChange={(v) => set(f.name, v)}
                        onBlur={() => touch(f.name)}
                      />
                    ))}
                </div>
                {groups[step][0] === 'history' && (
                  <p className="mt-4 text-xs text-ink-3">
                    Yes/No findings default to &quot;No&quot;. Confirm each item against the clinical record.
                  </p>
                )}
              </fieldset>
            ) : (
              <div className="space-y-5">
                <h3 className="text-base font-semibold text-ink">Review before submitting</h3>
                {allErrors.length > 0 && (
                  <Alert tone="error" title="Required corrections">
                    {allErrors.map((f) => `${f.label}: ${issueOf(f)!.message}`).join(' • ')}
                  </Alert>
                )}
                {warnings.length > 0 && (
                  <Alert tone="warn" title="Values outside training-set range">
                    {warnings.map((f) => f.label).join(', ')}. Predictions on extreme values may be less reliable.
                  </Alert>
                )}
                {error && (
                  <Alert tone="error" title={error.message}>
                    {error.problems.length > 0 && (
                      <ul className="mt-1 list-disc pl-4">
                        {error.problems.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    )}
                  </Alert>
                )}
                {groups.map(([g, label], gi) => (
                  <section key={g}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                        {label}
                      </h4>
                      <button
                        type="button"
                        className="text-xs text-accent font-semibold hover:underline"
                        onClick={() => setStep(gi)}
                      >
                        Edit
                      </button>
                    </div>
                    <dl className="grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2 xl:grid-cols-3">
                      {schema.features
                        .filter((f) => f.group === g)
                        .map((f) => (
                          <div
                            key={f.name}
                            className="flex justify-between gap-3 border-b border-line/60 py-1"
                          >
                            <dt className="text-ink-2 truncate max-w-[150px]">{f.label}</dt>
                            <dd className="font-medium text-ink tabular-nums">
                              {f.derived ? (
                                bmi != null ? (
                                  `${bmi} kg/m²`
                                ) : (
                                  '—'
                                )
                              ) : values[f.name] === '' ? (
                                <Badge>not provided</Badge>
                              ) : (
                                displayValue(f, values[f.name])
                              )}
                            </dd>
                          </div>
                        ))}
                    </dl>
                  </section>
                ))}
              </div>
            )}
          </Card>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="secondary"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </Button>
            {step < reviewStep ? (
              <Button onClick={goNext}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} loading={submitting} disabled={allErrors.length > 0}>
                <Send className="h-4 w-4" /> {submitting ? 'Submitting...' : 'Submit Assessment'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}