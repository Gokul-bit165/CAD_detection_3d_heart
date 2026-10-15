import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Html, OrbitControls, useProgress } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { Activity, Eye, Info, Layers, Pause, Play, Route, RotateCcw, Skull, X } from 'lucide-react'
import { riskGradientCss } from '../../lib/risk'
import { cx } from '../../components/ui'
import type { VesselId } from '../../types/api'
import ProceduralHeart, { type Risks } from './ProceduralHeart'
import ScanHeart, { type ModelFocus } from './ScanHeart'
import { ARTERIES, HEART_CENTER } from './anatomy'
import { MODEL_ATTRIBUTION, VESSEL_IDS } from './vesselConfig'

export interface HeartSceneProps {
  /** Vessel probabilities (0-1). Omit/null = no prediction: neutral anatomy. */
  risks?: Risks
  /** True when `risks` are hand-set scores (3D explorer), not a model prediction: shows an on-canvas tag. */
  manual?: boolean
  selected: VesselId | null
  onSelect: (id: VesselId | null) => void
  /** Compact preview: no toolbar/legend/labels. */
  compact?: boolean
  className?: string
  /** Increment to fly the camera back to the overview (and clear selection) from outside. */
  resetSignal?: number
}

// ------------------------------------------------------------------ camera moves
interface Goal { pos: THREE.Vector3; target: THREE.Vector3 }
const goalFor = (dir: THREE.Vector3, dist: number, target: THREE.Vector3): Goal => ({ pos: target.clone().addScaledVector(dir.clone().normalize(), dist), target })

interface Goals { overview: Goal; views: Record<string, Goal>; vessel: (id: VesselId) => Goal; center: THREE.Vector3 }

/** Camera targets for the procedural heart (fallback) or, when `f` is given, for the loaded GLB. */
function makeGoals(f: ModelFocus | null): Goals {
  const c = f ? f.center : HEART_CENTER
  const d = f ? 5.6 : 6.2
  const overview = goalFor(new THREE.Vector3(0.05, 0.07, 1), d, c.clone())
  const views: Record<string, Goal> = {
    front: overview,
    back: goalFor(new THREE.Vector3(0.1, 0.1, -1), d, c.clone()),
    left: goalFor(new THREE.Vector3(1, 0.15, 0.1), d, c.clone()),
    top: goalFor(new THREE.Vector3(0.1, 1, 0.35), d, c.clone()),
    inside: f ? goalFor(new THREE.Vector3(0.3, 0.2, 1), 3.8, c.clone()) : goalFor(new THREE.Vector3(0.1, 0.2, 1), 3.3, new THREE.Vector3(0.05, 0.3, 0)),
  }
  const vessel = (id: VesselId): Goal => {
    const mid = f ? f.vessels[id].clone() : ARTERIES[id].curve.getPointAt(0.5)
    const dir = mid.clone().sub(c).setY(mid.y * 0.2).normalize()
    return goalFor(dir.add(new THREE.Vector3(0, 0.12, 0.15)), f ? 2.6 : 2.7, mid.clone().lerp(c, 0.25))
  }
  return { overview, views, vessel, center: c }
}

/** Eases the camera and orbit target towards `goal`; any user drag cancels the move. */
function CameraRig({ goal, controls }: { goal: Goal | null; controls: RefObject<OrbitControlsImpl | null> }) {
  const active = useRef(false)
  useEffect(() => { active.current = !!goal }, [goal])
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const stop = () => { active.current = false }
    c.addEventListener('start', stop)
    return () => c.removeEventListener('start', stop)
  }, [controls])
  useFrame(({ camera }, dt) => {
    const c = controls.current
    if (!goal || !c || !active.current) return
    const k = 1 - Math.exp(-3.4 * Math.min(dt, 0.05))
    camera.position.lerp(goal.pos, k)
    c.target.lerp(goal.target, k)
    c.update()
    if (camera.position.distanceTo(goal.pos) < 0.01 && c.target.distanceTo(goal.target) < 0.01) active.current = false
  })
  return null
}

class Boundary extends Component<{ children: ReactNode; onError?: (e: Error) => void }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(e: Error) { this.props.onError?.(e) }
  render() {
    if (!this.state.error) return this.props.children
    if (this.props.onError) return null // the caller swaps in a fallback
    return (
      <Html center>
        <div className="w-72 rounded-xl border border-red-200 bg-white p-4 text-center text-sm shadow">
          <p className="font-semibold text-red-800">3D heart could not be rendered</p>
          <p className="mt-1 text-navy-500">{this.state.error.message}</p>
        </div>
      </Html>
    )
  }
}

function Loader() {
  const { progress } = useProgress()
  const portal = usePortal()
  return <Html center portal={portal}><div role="status" className="rounded-full bg-white px-4 py-2 text-xs font-medium text-navy-700 shadow">Building heart… {Math.round(progress)}%</div></Html>
}
function usePortal() {
  const { gl } = useThree()
  return useMemo(() => ({ current: gl.domElement.parentElement as HTMLElement }), [gl])
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

const TOUR: { label: string; view: string | VesselId }[] = [
  { label: 'Overview', view: 'front' }, { label: 'LAD', view: 'LAD' }, { label: 'LCX', view: 'LCX' }, { label: 'RCA', view: 'RCA' },
  { label: 'Inside view', view: 'inside' }, { label: 'Overview', view: 'front' },
]
const STEP_MS = 3800

export default function HeartScene({ risks, manual, selected, onSelect, compact, className, resetSignal }: HeartSceneProps) {
  const controls = useRef<OrbitControlsImpl>(null)
  const [rotate, setRotate] = useState(true)
  const [beat, setBeat] = useState(true)
  const [info, setInfo] = useState(false)
  const [xray, setXray] = useState(false)
  const [damage, setDamage] = useState(true)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [tour, setTour] = useState<number | null>(null)
  const [focus, setFocus] = useState<ModelFocus | null>(null)
  const [useScan, setUseScan] = useState(true)
  const goals = useMemo(() => makeGoals(focus), [focus])
  const [gl] = useState(webglAvailable)
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  useEffect(() => { if (reduced) { setRotate(false); setBeat(false) } }, [reduced])

  const fly = (view: string | VesselId) => setGoal(view in goals.views ? goals.views[view] : goals.vessel(view as VesselId))
  const anyRisk = !!risks && VESSEL_IDS.some((id) => risks[id] != null)

  // Fly to a vessel when it is selected (from the canvas, a card or a button).
  useEffect(() => { if (!compact && selected) setGoal(goals.vessel(selected)) }, [selected, compact])  // eslint-disable-line react-hooks/exhaustive-deps
  // The scan has loaded: frame it using its own centre.
  useEffect(() => { if (focus) setGoal(goals.overview) }, [focus])  // eslint-disable-line react-hooks/exhaustive-deps
  // Reset from outside.
  useEffect(() => { if (resetSignal) { setTour(null); setXray(false); setGoal(goals.overview) } }, [resetSignal])  // eslint-disable-line react-hooks/exhaustive-deps

  // Guided tour: step through overview -> each artery -> inside view.
  useEffect(() => {
    if (tour == null) return
    const step = TOUR[tour]
    if (step.view === 'inside') { setXray(true); setGoal(goals.views.inside); onSelect(null) }
    else if (step.view === 'front') { setXray(false); setGoal(goals.overview); onSelect(null) }
    else onSelect(step.view as VesselId)
    const t = setTimeout(() => setTour(tour + 1 < TOUR.length ? tour + 1 : null), STEP_MS)
    return () => clearTimeout(t)
  }, [tour])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!gl) {
    return <div className={cx('grid place-items-center rounded-2xl border border-line bg-white p-8 text-center text-sm text-navy-500', className)}>
      WebGL is not available in this browser, so the 3D heart cannot be displayed. The assessment and results panels still work.</div>
  }

  return (
    <div className={cx('relative overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-[#fbfdff] to-[#dde8f1]', className)}>
      <Canvas camera={{ position: goals.overview.pos.toArray(), fov: 36 }} dpr={[1, 1.75]} gl={{ antialias: true }}
        onPointerMissed={() => onSelect(null)} aria-label="Interactive 3D heart. Drag to rotate, scroll to zoom, click a coronary artery to select it.">
        <hemisphereLight args={['#ffffff', '#c9d6e2', 1.0]} />
        <directionalLight position={[3, 4, 5]} intensity={2.3} />
        <directionalLight position={[-4, 1, -3]} intensity={1.0} color="#bcd4ff" />
        <directionalLight position={[0, -3, 2]} intensity={0.5} color="#ffe3d6" />
        <Boundary key={String(useScan)} onError={useScan ? () => { setUseScan(false); setFocus(null) } : undefined}>
          <Suspense fallback={<Loader />}>
            {useScan
              ? <ScanHeart risks={risks} selected={selected} onSelect={onSelect} heartbeat={beat} showLabels={!compact} xray={xray} damage={damage} onReady={setFocus} />
              : <ProceduralHeart risks={risks} selected={selected} onSelect={onSelect} heartbeat={beat} showLabels={!compact} xray={xray} damage={damage} />}
          </Suspense>
        </Boundary>
        {!compact && <ContactShadows position={[0, -1.55, 0]} opacity={0.3} scale={6} blur={2.6} far={3} />}
        <OrbitControls ref={controls} makeDefault enableDamping enablePan={!compact} target={goals.center.toArray()}
          minDistance={1.6} maxDistance={9} autoRotate={rotate && !selected && tour == null} autoRotateSpeed={0.9} />
        <CameraRig goal={goal} controls={controls} />
      </Canvas>

      {!compact && (
        <span className="absolute left-3 top-3 rounded-full bg-teal-soft px-2.5 py-1 text-xs font-medium text-teal-800">
          {tour != null ? `Tour ${tour + 1}/${TOUR.length}: ${TOUR[tour].label}` : xray ? (focus ? 'Ghost view · arteries seen through the heart' : 'Inside view · valves & blood flow') : 'Anatomical heart · LAD · LCX · RCA'}
        </span>
      )}
      {manual && anyRisk && (
        <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold tracking-wide text-white">MANUAL SCORES</span>
      )}

      {!compact && (
        <>
          <div className="absolute right-3 top-12 flex flex-col items-end gap-1.5">
            {(['front', 'back', 'left', 'top'] as const).map((v) => (
              <button key={v} type="button" onClick={() => { setTour(null); fly(v) }}
                className="h-7 rounded-lg bg-white/95 px-2.5 text-[11px] font-medium capitalize text-navy-700 shadow-sm ring-1 ring-line hover:bg-white">{v}</button>
            ))}
            <ToolButton label={tour != null ? 'Stop guided tour' : 'Start guided tour'} active={tour != null} onClick={() => setTour(tour != null ? null : 0)}><Route className="h-4 w-4" /></ToolButton>
            <ToolButton label={xray ? 'Show solid heart' : focus ? 'Ghost view: see arteries through the heart' : 'Inside view: see valves and blood flow'} active={xray} onClick={() => { setXray((v) => !v); if (!xray) fly('inside') }}><Eye className="h-4 w-4" /></ToolButton>
            <ToolButton label={damage ? 'Hide plaque markers' : 'Show plaque markers'} active={damage} onClick={() => setDamage((v) => !v)}><Layers className="h-4 w-4" /></ToolButton>
            <ToolButton label="Reset camera and selection" onClick={() => { setTour(null); setXray(false); setGoal(goals.overview); onSelect(null) }}><RotateCcw className="h-4 w-4" /></ToolButton>
            <ToolButton label={rotate ? 'Pause rotation' : 'Resume rotation'} onClick={() => setRotate((v) => !v)}>{rotate ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</ToolButton>
            <ToolButton label={beat ? 'Stop heartbeat animation' : 'Start heartbeat animation'} active={beat} onClick={() => setBeat((v) => !v)}><Activity className="h-4 w-4" /></ToolButton>
            <ToolButton label="About this model" active={info} onClick={() => setInfo((v) => !v)}><Info className="h-4 w-4" /></ToolButton>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 space-y-1.5 rounded-lg bg-white/90 px-3 py-2 text-[11px] text-navy-500 shadow-sm ring-1 ring-line">
            <div>
              <div className="mb-1 font-medium text-navy-700">{anyRisk ? (manual ? 'Manual damage score' : 'Predicted stenosis probability') : 'No prediction loaded'}</div>
              <div className="h-2 w-36 rounded-full" style={{ background: riskGradientCss }} />
              <div className="mt-0.5 flex justify-between"><span>0%</span><span>100%</span></div>
            </div>
            {!focus && (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: '#ff4a3d' }} />oxygenated</span>
                <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: '#4f6bdc' }} />deoxygenated</span>
              </div>
            )}
            {anyRisk && damage && <div className="flex items-center gap-1"><Skull className="h-3 w-3" /> pale bulges = plaque, size ∝ score</div>}
          </div>
        </>
      )}

      {info && (
        <div className="absolute inset-x-3 top-12 z-10 max-h-[70%] overflow-auto rounded-xl bg-white p-4 text-[13px] leading-relaxed text-navy-700 shadow-lg ring-1 ring-line sm:left-auto sm:w-96">
          <button onClick={() => setInfo(false)} aria-label="Close" className="absolute right-2 top-2 rounded p-1 text-navy-500 hover:bg-canvas"><X className="h-4 w-4" /></button>
          <p className="font-semibold text-navy-900">About this 3D heart</p>
          <p className="mt-1">{focus ? 'Photogrammetry heart scan (cleaned and decimated in Blender) with separate LAD, LCX and RCA artery trees traced along the scan\u2019s grooves. A bright pulse travels along each artery, slower for higher scores.' : MODEL_ATTRIBUTION.description}</p>
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-950">{focus ? 'Artery paths are approximate and textbook-style, not patient-specific. The scan\u2019s source licence has not been verified. Plaque markers show model output only, not a confirmed lesion location.' : MODEL_ATTRIBUTION.licenceNote}</p>
          <p className="mt-2">Colour and plaque size follow each vessel&rsquo;s model score; the flow pulse moves more slowly through higher-scoring arteries.</p>
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
