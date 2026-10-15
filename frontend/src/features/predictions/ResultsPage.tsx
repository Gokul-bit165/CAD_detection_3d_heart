import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, RotateCcw } from 'lucide-react'
import { Alert, Badge, Button, Card, cx } from '../../components/ui'
import { Reveal } from '../../components/motion'
import { api, ApiError } from '../../services/api'
import type { PredictionResponse, TargetId, VesselId } from '../../types/api'
import { useAppData } from '../../app/AppData'
import type { ShellContextType } from '../../app/AppShell'
import LazyHeartScene from '../heart-3d/LazyHeartScene'
import { VESSEL_IDS } from '../heart-3d/vesselConfig'
import PatientSnapshotPanel from './panels/PatientSnapshotPanel'
import VerdictCard from './panels/VerdictCard'
import WhyCard from './panels/WhyCard'
import VesselCards from './panels/VesselCards'
import NextStepsCard from './panels/NextStepsCard'
import CaveatsCard from './panels/CaveatsCard'
import FullDriversExplorer from './panels/FullDriversExplorer'
import InputSummary from './InputSummary'
import DriversChart from './charts/DriversChart'
import VesselThresholdChart from './charts/VesselThresholdChart'
import LabsVsRangeChart from './charts/LabsVsRangeChart'
import ClinicalBurdenRadar from './charts/ClinicalBurdenRadar'

export default function ResultsPage({
  predictionId,
  initialData,
}: {
  predictionId?: string
  initialData?: PredictionResponse
} = {}) {
  const params = useParams<{ id: string }>()
  const id = predictionId ?? params.id
  const { schema } = useAppData()
  const shellContext = useOutletContext<ShellContextType | undefined>()

  const [data, setData] = useState<PredictionResponse | null>(initialData ?? null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(!initialData && Boolean(id))
  const [selected, setSelected] = useState<VesselId | null>(null)
  const [resetCount, setResetCount] = useState(0)
  const [tourStep, setTourStep] = useState<{
    index: number
    total: number
    vessel: VesselId
    status: string
  } | null>(null)

  // Expand AppShell max-width to wide mode (1760px) for this report page
  useEffect(() => {
    shellContext?.setWide?.(true)
    return () => {
      shellContext?.setWide?.(false)
    }
  }, [shellContext])

  useEffect(() => {
    if (initialData) {
      setData(initialData)
      setLoading(false)
      return
    }
    if (!id) return

    setLoading(true)
    setError(null)
    let cancelled = false

    api
      .getPrediction(id)
      .then((r) => {
        if (!cancelled) {
          setData(r)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Failed to load the prediction.')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id, initialData])

  const risks = useMemo(() => {
    if (!data?.vessels) return undefined
    return Object.fromEntries(
      VESSEL_IDS.map((v) => [v, data.vessels![v]?.probability ?? null])
    ) as Record<VesselId, number | null>
  }, [data])

  // Active target for DriversChart: defaults to CAD, or follows selected artery
  const activeDriverTarget: TargetId = selected || tourStep?.vessel || 'CAD'

  const scrollToFullDrivers = () => {
    const el = document.getElementById('full-drivers-explorer')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  if (loading) {
    return <ReportSkeleton />
  }

  if (error || !data) {
    return (
      <div className="py-12 max-w-xl mx-auto space-y-4">
        <Alert tone="error" title="Could not load assessment report">
          {error || 'Prediction record not found.'}
        </Alert>
        <div className="flex gap-3">
          <Link to="/assessment">
            <Button variant="primary">
              <ClipboardList className="h-4 w-4" /> Start New Assessment
            </Button>
          </Link>
          <Link to="/history">
            <Button variant="secondary">View History</Button>
          </Link>
        </div>
      </div>
    )
  }

  const overallProb = data.overall?.probability ?? 0
  const thr = data.overall?.threshold ?? 0.42
  const isFlagged = data.overall?.predicted_class === 'positive' || overallProb >= thr

  return (
    <div className="space-y-6 animate-rise">
      {/* Top Breadcrumb & Metadata Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-line/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/history"
              className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink transition-colors font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to History
            </Link>
            <span className="text-ink-3/40 font-bold">/</span>
            <span className="font-mono text-xs uppercase tracking-wider text-ink-3">
              Assessment Report
            </span>
            <Badge tone={isFlagged ? 'red' : 'teal'}>
              {isFlagged ? 'CAD Flagged' : 'CAD Negative'}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Coronary Assessment & 3D Anatomy
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
            <span>
              Record ID: <code className="font-semibold text-ink font-mono">{data.id}</code>
            </span>
            <span className="text-ink-3/40 font-bold">/</span>
            <span>{new Date(data.created_at).toLocaleString()}</span>
            <span className="text-ink-3/40 font-bold">/</span>
            <span>
              Engine: <strong className="text-ink-2 font-medium">{data.model_version ?? '2026-10-ens5'}</strong>
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/assessment">
            <Button variant="secondary">
              <ClipboardList className="h-4 w-4 text-accent" /> New Assessment
            </Button>
          </Link>
        </div>
      </div>

      {/* Main 3-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_340px] gap-6 items-start w-full min-w-0">
        {/* Left Column: Patient Snapshot Panel (Desktop: Col 1, Mobile: Order 6) */}
        <div className="order-6 lg:order-1 lg:col-span-1">
          <Reveal delay={0.05}>
            <PatientSnapshotPanel inputs={data.inputs} schema={schema} />
          </Reveal>
        </div>

        {/* Center Column: 3D Heart + Controls + 4 Mini-Charts (Desktop: Col 2, Mobile: Order 2) */}
        <div className="order-2 lg:order-2 lg:col-span-1 space-y-4 min-w-0">
          {/* Heart Scene Container */}
          <div className="relative rounded-2xl border border-line bg-surface p-2 shadow-sm overflow-hidden">
            {/* Vessel Focus Bar above heart */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-line/60 bg-surface-2/40 rounded-xl mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <span className="text-ink-3 text-[11px] uppercase tracking-wider mr-1">Focus:</span>
                {VESSEL_IDS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSelected(selected === v ? null : v)}
                    className={cx(
                      'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                      selected === v
                        ? 'bg-accent text-surface shadow-xs'
                        : 'bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink border border-line'
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {tourStep && (
                  <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent border border-accent/20 animate-pulse">
                    Tour: {tourStep.vessel} ({tourStep.index + 1}/{tourStep.total})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null)
                    setResetCount((c) => c + 1)
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors"
                  title="Reset 3D camera overview"
                >
                  <RotateCcw className="h-3 w-3" /> Reset view
                </button>
              </div>
            </div>

            {/* 3D Heart Scene (Dominant viewport-sized viewer) */}
            <LazyHeartScene
              className="h-[clamp(560px,78vh,900px)] w-full rounded-xl overflow-hidden"
              risks={risks}
              selected={selected}
              onSelect={setSelected}
              resetSignal={resetCount}
              findings={data.findings ?? undefined}
              onTourStep={setTourStep}
            />
          </div>

          {/* 4 Mini-Charts row directly under the heart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="min-h-[260px] shadow-sm border border-line min-w-0 overflow-hidden hover:border-ink-3/30 transition-colors">
              <DriversChart explanation={data.explanation} target={activeDriverTarget} />
            </Card>

            <Card className="min-h-[260px] shadow-sm border border-line min-w-0 overflow-hidden hover:border-ink-3/30 transition-colors">
              <VesselThresholdChart
                overall={data.overall}
                vessels={data.vessels}
                findings={data.findings}
                selected={selected}
                onSelect={setSelected}
              />
            </Card>

            <Card className="min-h-[260px] shadow-sm border border-line min-w-0 overflow-hidden hover:border-ink-3/30 transition-colors">
              <LabsVsRangeChart inputs={data.inputs} schema={schema} />
            </Card>

            <Card className="min-h-[260px] shadow-sm border border-line min-w-0 overflow-hidden hover:border-ink-3/30 transition-colors">
              <ClinicalBurdenRadar inputs={data.inputs} schema={schema} />
            </Card>
          </div>
        </div>

        {/* Right Column: Verdict, Why, Vessels, Next Steps, Caveats (Desktop: Col 3, Mobile: Orders 1, 3, 4, 5) */}
        <div className="order-1 lg:order-3 lg:col-span-2 xl:col-span-1 space-y-4">
          <Reveal delay={0.1}>
            <VerdictCard overall={data.overall} />
          </Reveal>

          <Reveal delay={0.15}>
            <WhyCard
              explanation={data.explanation}
              schema={schema}
              onSeeAllDrivers={scrollToFullDrivers}
            />
          </Reveal>

          <Reveal delay={0.2}>
            <VesselCards
              vessels={data.vessels}
              findings={data.findings}
              selected={selected}
              tourVessel={tourStep?.vessel}
              onSelect={setSelected}
            />
          </Reveal>

          <Reveal delay={0.25}>
            <NextStepsCard />
          </Reveal>

          <Reveal delay={0.3}>
            <CaveatsCard modelVersion={data.model_version} />
          </Reveal>
        </div>
      </div>

      {/* Bottom Full-Width Collapsible Sections */}
      <div className="pt-4 space-y-4 border-t border-line/60">
        <FullDriversExplorer
          explanation={data.explanation}
          modelVersion={data.model_version}
          selected={selected}
          onSelectTarget={(t) => {
            if (t !== 'CAD') setSelected(t as VesselId)
            else setSelected(null)
          }}
        />

        <InputSummary inputs={data.inputs} />
      </div>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-line">
        <div className="space-y-2">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-8 w-80" />
        </div>
        <div className="skeleton h-10 w-36" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_340px] gap-5">
        <div className="skeleton h-[600px] rounded-2xl" />
        <div className="space-y-4">
          <div className="skeleton h-[560px] rounded-2xl" />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="skeleton h-[230px] rounded-2xl" />
            <div className="skeleton h-[230px] rounded-2xl" />
            <div className="skeleton h-[230px] rounded-2xl" />
            <div className="skeleton h-[230px] rounded-2xl" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="skeleton h-[200px] rounded-2xl" />
          <div className="skeleton h-[260px] rounded-2xl" />
          <div className="skeleton h-[300px] rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
