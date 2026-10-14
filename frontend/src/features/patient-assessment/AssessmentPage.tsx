import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, FlaskConical, RotateCcw, Send, Sparkles } from 'lucide-react'
import { useAppData } from '../../app/AppData'
import { Alert, Badge, Button, Card, Spinner, cx } from '../../components/ui'
import { api, ApiError } from '../../services/api'
import type { FeatureSpec, FeatureValue, FeatureValues } from '../../types/api'
import { displayValue } from '../predictions/InputSummary'
import FieldControl from './FieldControl'
import { bmiOf, defaults, EXAMPLE_VALUES, CLINICAL_PRESETS, toPayload, validateField } from './validation'

const STORAGE_KEY = 'cardiovista.assessment.draft'

function loadDraft(): FeatureValues | null {
  try { const s = sessionStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null } catch { return null }
}
function saveDraft(v: FeatureValues) { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v)) } catch { /* private mode */ } }

export default function AssessmentPage() {
  const { schema, schemaError, apiOnline, modelInfo } = useAppData()
  const navigate = useNavigate()
  const [values, setValues] = useState<FeatureValues | null>(null)
  const [step, setStep] = useState(0)
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<{ message: string; problems: string[] } | null>(null)
  const [isExample, setIsExample] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  useEffect(() => {
    if (schema && !values) setValues({ ...defaults(schema), ...(loadDraft() ?? {}) })
  }, [schema, values])
  useEffect(() => { if (values) saveDraft(values) }, [values])

  const groups = useMemo(() => schema ? Object.entries(schema.groups).filter(([g]) => schema.features.some((f) => f.group === g)) : [], [schema])
  const reviewStep = groups.length

  if (schemaError) return <Alert tone="error" title="Could not load the assessment form">{schemaError}</Alert>
  if (apiOnline === false) return <Alert tone="error" title="API offline">The assessment form is generated from the backend's feature schema. Start the backend (see README) and reload.</Alert>
  if (!schema || !values) return <Spinner label="Loading form" />

  const bmi = bmiOf(values)
  const set = (name: string, v: FeatureValue) => { setValues({ ...values, [name]: v }); setIsExample(false); setActivePreset(null) }
  const touch = (name: string) => setTouched((t) => new Set(t).add(name))
  const issueOf = (f: FeatureSpec) => validateField(f, values[f.name])
  const stepErrors = (g: string) => schema.features.filter((f) => f.group === g && issueOf(f)?.level === 'error')
  const allErrors = schema.features.filter((f) => issueOf(f)?.level === 'error')
  const warnings = schema.features.filter((f) => issueOf(f)?.level === 'warning')

  const goNext = () => {
    const errs = stepErrors(groups[step][0])
    if (errs.length) { setTouched((t) => new Set([...t, ...errs.map((e) => e.name)])); return }
    setStep(step + 1)
  }
  const reset = () => { setValues(defaults(schema)); setTouched(new Set()); setStep(0); setError(null); setIsExample(false); setActivePreset(null) }
  const loadExample = () => { setValues({ ...defaults(schema), ...EXAMPLE_VALUES }); setIsExample(true); setActivePreset(null); setError(null) }
  const loadPreset = (presetId: string) => {
    const p = CLINICAL_PRESETS.find((c) => c.id === presetId)
    if (!p) return
    setValues({ ...defaults(schema), ...p.values })
    setActivePreset(presetId)
    setIsExample(false)
    setError(null)
  }

  const selectedPresetObj = CLINICAL_PRESETS.find((c) => c.id === activePreset)

  const submit = async () => {
    if (allErrors.length) { setTouched(new Set(allErrors.map((e) => e.name))); setStep(groups.findIndex(([g]) => g === allErrors[0].group)); return }
    setSubmitting(true); setError(null)
    try {
      const r = await api.createPrediction(toPayload(schema, values))
      if (r.status === 'unavailable' || !r.id) {
        setError({ message: r.message ?? 'The prediction service is unavailable.', problems: [] })
      } else navigate(`/results/${r.id}`)
    } catch (e) {
      setError(e instanceof ApiError ? { message: e.message, problems: e.problems } : { message: 'Unexpected error while submitting.', problems: [] })
    } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-navy-900">New patient assessment</h2>
          <p className="mt-1 max-w-2xl text-sm text-navy-500">
            Enter the clinical features available for this patient. Ground-truth catheterization
            fields ({schema.excluded_inputs.slice(0, 4).join(', ')}) are strictly prohibited to prevent target leakage.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" onClick={loadExample}><FlaskConical className="h-4 w-4" /> Load synthetic example</Button>
          <Button variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" /> Reset form</Button>
        </div>
      </div>

      {/* Interactive Clinical Preset Pills */}
      <div className="rounded-2xl border border-line bg-white/90 p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-navy-500 mr-1">
            <Sparkles className="h-3.5 w-3.5 text-teal-600" /> Clinical Scenarios:
          </span>
          {CLINICAL_PRESETS.map((p) => {
            const active = activePreset === p.id
            return (
              <button key={p.id} type="button" onClick={() => loadPreset(p.id)}
                className={cx('inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all',
                  active ? 'bg-navy-900 text-white shadow-xs ring-1 ring-navy-900' : 'bg-canvas hover:bg-navy-900/5 text-navy-700 border border-line')}>
                <span>{p.name}</span>
                <span className={cx('text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                  p.id === 'triple-vessel' ? (active ? 'bg-red-500 text-white' : 'bg-red-100 text-red-800') :
                  p.id === 'isolated-lad' ? (active ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800') :
                  (active ? 'bg-teal-500 text-white' : 'bg-teal-soft text-teal-800'))}>
                  {p.tag}
                </span>
              </button>
            )
          })}
        </div>
        {selectedPresetObj && (
          <p className="mt-2 text-xs text-navy-600 bg-canvas/70 px-3 py-1.5 rounded-lg border border-line/60">
            <strong>Loaded profile:</strong> {selectedPresetObj.description}
          </p>
        )}
      </div>

      {modelInfo?.status === 'demo' && <Alert tone="warn" title="Research / Demo Mode">No trained model weights are connected. Submitting returns verified cardiovascular simulated outputs.</Alert>}
      {isExample && <Alert tone="info" title="Synthetic example loaded">These values are invented for testing and do not describe a real patient.</Alert>}

      <nav aria-label="Assessment steps" className="flex gap-1 overflow-x-auto pb-1">
        {[...groups.map(([, l]) => l), 'Review'].map((label, i) => {
          const done = i < step, cur = i === step
          return (
            <button key={label} onClick={() => i <= step || i === reviewStep ? setStep(i) : undefined}
              aria-current={cur ? 'step' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${cur ? 'bg-navy-900 text-white' : done ? 'bg-teal-soft text-teal-800' : 'bg-white text-navy-500 ring-1 ring-line'}`}>
              <span className="grid h-4 w-4 place-items-center rounded-full bg-white/20 text-[10px]">{done ? <Check className="h-3 w-3" /> : i + 1}</span>
              {label}
            </button>
          )
        })}
      </nav>

      <Card className="p-5 sm:p-6">
        {step < reviewStep ? (
          <fieldset>
            <legend className="mb-4 text-base font-semibold text-navy-900">{groups[step][1]}</legend>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              {schema.features.filter((f) => f.group === groups[step][0]).map((f) => (
                <FieldControl key={f.name} spec={f} value={values[f.name]} issue={issueOf(f)} touched={touched.has(f.name)}
                  readOnlyValue={f.derived ? (bmi != null ? `${bmi} kg/m²` : 'Enter weight and height') : undefined}
                  onChange={(v) => set(f.name, v)} onBlur={() => touch(f.name)} />
              ))}
            </div>
            {groups[step][0] === 'history' && <p className="mt-4 text-xs text-navy-500">Yes/No findings start as “No”. Confirm each against the patient's record before continuing.</p>}
          </fieldset>
        ) : (
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-navy-900">Review before submitting</h3>
            {allErrors.length > 0 && <Alert tone="error" title="Fix these before submitting">{allErrors.map((f) => `${f.label}: ${issueOf(f)!.message}`).join(' · ')}</Alert>}
            {warnings.length > 0 && <Alert tone="warn" title="Values outside the training-data range">{warnings.map((f) => f.label).join(', ')}. Predictions for unusual values are less reliable.</Alert>}
            {error && <Alert tone="error" title={error.message}>{error.problems.length > 0 && <ul className="mt-1 list-disc pl-4">{error.problems.map((p) => <li key={p}>{p}</li>)}</ul>}</Alert>}
            {groups.map(([g, label], gi) => (
              <section key={g}>
                <div className="mb-1.5 flex items-center gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-500">{label}</h4>
                  <button className="text-xs text-blue-brand underline" onClick={() => setStep(gi)}>Edit</button>
                </div>
                <dl className="grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2 xl:grid-cols-3">
                  {schema.features.filter((f) => f.group === g).map((f) => (
                    <div key={f.name} className="flex justify-between gap-3 border-b border-line/70 py-1">
                      <dt className="text-navy-500">{f.label}</dt>
                      <dd className="font-medium text-navy-900">
                        {f.derived ? (bmi != null ? `${bmi} kg/m²` : '—') : values[f.name] === '' ? <Badge>not provided</Badge> : displayValue(f, values[f.name])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            {schema.unsupported_groups.length > 0 && (
              <p className="text-xs leading-relaxed text-navy-500">
                Not collected: {schema.unsupported_groups.map((u) => u.group).join('; ')} — these have no verified entry in the feature dictionary (see docs/SCHEMA_NOTES.md).
              </p>
            )}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ArrowLeft className="h-4 w-4" /> Previous</Button>
        {step < reviewStep
          ? <Button onClick={goNext}>Next <ArrowRight className="h-4 w-4" /></Button>
          : <Button onClick={submit} loading={submitting} disabled={allErrors.length > 0}><Send className="h-4 w-4" /> {submitting ? 'Submitting' : 'Submit assessment'}</Button>}
      </div>
    </div>
  )
}
