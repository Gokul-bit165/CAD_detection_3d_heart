import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Html, OrbitControls, useProgress } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Activity, Info, Pause, Play, RotateCcw, X } from 'lucide-react'
import { riskGradientCss } from '../../lib/risk'
import { cx } from '../../components/ui'
import type { VesselId } from '../../types/api'
import HeartModel, { type Risks } from './HeartModel'
import type { SceneReport } from './inspect'
import { MODEL_ATTRIBUTION, MODEL_URL, VESSEL_IDS } from './vesselConfig'
import type { Vec3, VesselPaths } from './vesselPaths'
import type { Bp3dViews } from './bp3dVessels'

export interface HeartSceneProps {
  /** Vessel probabilities (0-1). Omit/null = no prediction: neutral anatomy. */
  risks?: Risks
  /** True when `risks` are demo placeholders: shows an on-canvas DEMO tag. */
  illustrative?: boolean
  selected: VesselId | null
  onSelect: (id: VesselId | null) => void
  onReport?: (r: SceneReport) => void
  /** Compact preview: no toolbar/legend/labels. */
  compact?: boolean
  className?: string
  /** Alternative GLB (e.g. the view-only scan). Defaults to the schematic with mapped vessels. */
  modelUrl?: string
  /** Overlay centre-lines (defaults to saved/seeded paths). */
  paths?: VesselPaths
  /** Vessel-placement mode: clicks on the heart add a point to this vessel. */
  editVessel?: VesselId | null
  onEditPoint?: (id: VesselId, p: Vec3) => void
  /** Increment to reset the camera (and clear selection) from outside. */
  resetSignal?: number
  /** Opt-in per-vessel BodyParts3D meshes (default: seeded overlay). */
  bp3d?: Bp3dViews
}

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <Html center>
        <div className="w-72 rounded-xl border border-red-200 bg-white p-4 text-center text-sm shadow">
          <p className="font-semibold text-red-800">3D model could not be loaded</p>
          <p className="mt-1 text-navy-500">Expected a valid GLB at <code className="text-[12px]">{MODEL_URL}</code>. Check that the file exists and is a valid glTF binary.</p>
        </div>
      </Html>
    )
  }
}

function Loader() {
  const { progress } = useProgress()
  const { gl } = useThree()
  // Stable DOM target (see FloatingLabel): drei's Html otherwise re-creates its root mid-render.
  const portal = useMemo(() => ({ current: gl.domElement.parentElement as HTMLElement }), [gl])
  return <Html center portal={portal}><div role="status" className="rounded-full bg-white px-4 py-2 text-xs font-medium text-navy-700 shadow">Loading 3D model… {Math.round(progress)}%</div></Html>
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

export default function HeartScene({ risks, illustrative, selected, onSelect, onReport, compact, className, modelUrl, paths, editVessel, onEditPoint, bp3d, resetSignal }: HeartSceneProps) {
  const controls = useRef<OrbitControlsImpl>(null)
  const [rotate, setRotate] = useState(true)
  const [beat, setBeat] = useState(true)
  const [info, setInfo] = useState(false)
  const [report, setReport] = useState<SceneReport | null>(null)
  const [gl] = useState(webglAvailable)
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  useEffect(() => { if (reduced) { setRotate(false); setBeat(false) } }, [reduced])

  useEffect(() => { if (resetSignal) controls.current?.reset() }, [resetSignal])

  const handleReport = (r: SceneReport) => { setReport(r); onReport?.(r) }
  const allMapped = report ? VESSEL_IDS.every((id) => report.mapped[id]) : null
  // Reflect what is actually drawn (loaded), not merely requested: a failed load keeps the seeded overlay.
  const bpActive = report?.atlas?.shown ?? []
  const bpIso = report?.atlas?.isolated ?? undefined
  const bpLabel = bpIso ? `BodyParts3D ${bpIso} — isolated inspection` : bpActive.length ? `BodyParts3D ${bpActive.join(' · ')} — manual alignment, unverified` : null
  const anyRisk = risks && VESSEL_IDS.some((id) => risks[id] != null)

  if (!gl) {
    return <div className={cx('grid place-items-center rounded-2xl border border-line bg-white p-8 text-center text-sm text-navy-500', className)}>
      WebGL is not available in this browser, so the 3D heart cannot be displayed. The assessment and results panels still work.</div>
  }

  return (
    <div className={cx('relative overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-white to-[#eaf1f6]', className)}>
      <Canvas camera={{ position: [0.4, 0.35, 5.8], fov: 38 }} dpr={[1, 1.75]} gl={{ antialias: true }}
        onPointerMissed={() => onSelect(null)} aria-label="Interactive 3D heart. Drag to rotate, scroll to zoom, click a coronary artery to select it.">
        <hemisphereLight args={['#ffffff', '#c9d6e2', 1.1]} />
        <directionalLight position={[3, 4, 5]} intensity={2.2} />
        <directionalLight position={[-4, 1, -3]} intensity={0.9} color="#bcd4ff" />
        <Boundary>
          <Suspense fallback={<Loader />}>
            <HeartModel risks={risks} selected={selected} onSelect={onSelect} onReport={handleReport}
              heartbeat={beat} showLabels={!compact} url={modelUrl} paths={paths} editVessel={editVessel} onEditPoint={onEditPoint} bp3d={bp3d} />
          </Suspense>
        </Boundary>
        <OrbitControls ref={controls} makeDefault enableDamping enablePan={!compact} target={[0, 0.25, 0]}
          minDistance={2.2} maxDistance={9} autoRotate={rotate && !selected && !editVessel} autoRotateSpeed={0.9} />
      </Canvas>

      {!compact && report && (
        <span className={cx('absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium',
          allMapped ? 'bg-teal-soft text-teal-800' : 'bg-amber-100 text-amber-900')}>
          {!allMapped ? 'Vessel mapping pending' : bpLabel ?? (report.overlays?.length ? 'Vessel overlay — approximate placement' : 'Vessel mapping verified (LAD · LCX · RCA)')}
        </span>
      )}
      {illustrative && anyRisk && (
        <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold tracking-wide text-white">DEMO VALUES</span>
      )}

      {!compact && (
        <>
          <div className="absolute bottom-3 right-3 flex gap-1.5">
            <ToolButton label="Reset camera and selection" onClick={() => { controls.current?.reset(); onSelect(null) }}><RotateCcw className="h-4 w-4" /></ToolButton>
            <ToolButton label={rotate ? 'Pause rotation' : 'Resume rotation'} onClick={() => setRotate((v) => !v)}>{rotate ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</ToolButton>
            <ToolButton label={beat ? 'Stop heartbeat animation' : 'Start heartbeat animation'} active={beat} onClick={() => setBeat((v) => !v)}><Activity className="h-4 w-4" /></ToolButton>
            <ToolButton label="Model attribution" active={info} onClick={() => setInfo((v) => !v)}><Info className="h-4 w-4" /></ToolButton>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-[11px] text-navy-500 shadow-sm ring-1 ring-line">
            <div className="mb-1 font-medium text-navy-700">{anyRisk ? (illustrative ? 'Demo value scale' : 'Predicted stenosis probability') : 'No prediction loaded'}</div>
            <div className="h-2 w-36 rounded-full" style={{ background: riskGradientCss }} />
            <div className="mt-0.5 flex justify-between"><span>0%</span><span>100%</span></div>
          </div>
        </>
      )}

      {info && (
        <div className="absolute inset-x-3 top-12 z-10 max-h-[70%] overflow-auto rounded-xl bg-white p-4 text-[13px] leading-relaxed text-navy-700 shadow-lg ring-1 ring-line sm:left-auto sm:w-96">
          <button onClick={() => setInfo(false)} aria-label="Close" className="absolute right-2 top-2 rounded p-1 text-navy-500 hover:bg-canvas"><X className="h-4 w-4" /></button>
          <p className="font-semibold text-navy-900">3D model attribution</p>
          <p className="mt-1"><code className="text-[12px]">{MODEL_ATTRIBUTION.file}</code></p>
          <p className="mt-1">{MODEL_ATTRIBUTION.description}</p>
          <p className="mt-2">{MODEL_ATTRIBUTION.orientationNote}</p>
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-950">{MODEL_ATTRIBUTION.licenceNote}</p>
          <ul className="mt-2 list-disc pl-4">
            {MODEL_ATTRIBUTION.references.map((r) => <li key={r.url}><a className="text-blue-brand underline" href={r.url} target="_blank" rel="noreferrer">{r.label}</a></li>)}
          </ul>
          <p className="mt-2 text-navy-500">Highlighted vessels show model output only. They do not depict confirmed anatomical lesions, and vessel geometry is never altered to represent stenosis severity.</p>
        </div>
      )}
    </div>
  )
}

function ToolButton({ label, onClick, children, active }: { label: string; onClick: () => void; children: ReactNode; active?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} aria-pressed={active}
      className={cx('grid h-9 w-9 place-items-center rounded-lg shadow-sm ring-1 ring-line transition-colors',
        active ? 'bg-navy-900 text-white' : 'bg-white/95 text-navy-700 hover:bg-white')}>
      {children}
    </button>
  )
}
