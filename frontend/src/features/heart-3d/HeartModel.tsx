import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import type { VesselId } from '../../types/api'
import { pct, riskColor, riskRgb } from '../../lib/risk'
import { inspectScene, type SceneReport } from './inspect'
import { CONTEXT_OPACITY, MODEL_URL, VESSELS, VESSEL_IDS, VISUAL } from './vesselConfig'
import { loadPaths, type Vec3, type VesselPaths } from './vesselPaths'
import { ISOLATED_PLACEMENT, type Bp3dMode, type Placement } from './bp3dLad'
import { useBp3dLad, type Bp3dState } from './useBp3dLad'

export type Risks = Partial<Record<VesselId, number | null>>

interface Props {
  risks?: Risks
  selected: VesselId | null
  onSelect: (id: VesselId | null) => void
  onReport?: (r: SceneReport) => void
  heartbeat: boolean
  showLabels: boolean
  url?: string
  /** Overlay centre-lines; defaults to the saved/seeded paths. */
  paths?: VesselPaths
  /** When set, clicking the scan surface reports a point for this vessel instead of selecting. */
  editVessel?: VesselId | null
  onEditPoint?: (id: VesselId, p: Vec3) => void
  /** LAD source. 'seeded' (default) keeps the approximate overlay tube; the BodyParts3D modes are opt-in. */
  lad?: { mode: Bp3dMode; placement: Placement; color: string; onState?: (s: Bp3dState) => void }
}

const BLACK = new THREE.Color(0, 0, 0)
const OVERLAY_BASE = new THREE.Color('#3b6ea5')
const TUBE_RADIUS = 0.028

const meshToVessel = new Map<string, VesselId>(
  VESSEL_IDS.flatMap((id) => VESSELS[id].meshNames.map((n) => [n, id] as const)),
)

/** Surface point of a mesh closest to its bounding-box centre (a label anchor that sits on the vessel). */
function anchorOf(mesh: THREE.Mesh): THREE.Vector3 {
  const pos = mesh.geometry.attributes.position
  const c = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3())
  const v = new THREE.Vector3()
  let best = Infinity
  const out = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
    const d = v.distanceToSquared(c)
    if (d < best) { best = d; out.copy(v) }
  }
  return out
}

export default function HeartModel({ risks, selected, onSelect, onReport, heartbeat, showLabels, url = MODEL_URL, paths, editVessel, onEditPoint, lad }: Props) {
  const gltf = useGLTF(url)
  const group = useRef<THREE.Group>(null)
  const [hover, setHover] = useState<VesselId | null>(null)
  const pathSet = useMemo(() => paths ?? loadPaths(), [paths])
  const ladMode = lad?.mode ?? 'seeded'
  const bp = useBp3dLad(ladMode !== 'seeded')
  const bpReady = bp.status === 'ready' && !!bp.group
  const isolated = ladMode === 'isolated' && bpReady
  const stateRef = useRef(lad?.onState)
  stateRef.current = lad?.onState
  useEffect(() => { stateRef.current?.(bp) }, [bp])
  // Keep the latest callback without making it an effect dependency (it is often an inline function).
  const reportRef = useRef(onReport)
  reportRef.current = onReport

  // Own copy of the scene + materials so we never mutate the cached GLTF.
  const base = useMemo(() => {
    const root = gltf.scene.clone(true)
    root.updateWorldMatrix(true, true)
    const vesselMeshes = new Map<VesselId, THREE.Mesh[]>()
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const mat0 = (m.material as THREE.MeshStandardMaterial).clone()
      m.material = mat0
      const id = meshToVessel.get(m.name)
      if (!id) {
        // Context anatomy (heart body / aorta / the scan): never a vessel, so out of normal picking.
        if (m.name in CONTEXT_OPACITY) {
          mat0.transparent = true; mat0.opacity = CONTEXT_OPACITY[m.name]; mat0.depthWrite = false; mat0.side = THREE.DoubleSide
        }
        mat0.roughness = 0.9; mat0.metalness = 0 // matte: the scan has no speculars
        m.userData.pick = m.raycast
        m.raycast = () => {}
        m.renderOrder = 2
      } else {
        mat0.userData.base = mat0.color.clone()
        vesselMeshes.set(id, [...(vesselMeshes.get(id) ?? []), m])
      }
    })
    return { root, vesselMeshes }
  }, [gltf.scene])

  // Vessels that are not separate meshes in the GLB are drawn as overlay tubes along `pathSet`.
  const overlay = useMemo(() => {
    const g = new THREE.Group()
    const meshes = new Map<VesselId, THREE.Mesh[]>()
    const anchors = new Map<VesselId, THREE.Vector3>()
    const ids: VesselId[] = []
    for (const id of VESSEL_IDS) {
      if (base.vesselMeshes.has(id) || (id === 'LAD' && bpReady)) continue
      const pts = pathSet[id]?.map((p) => new THREE.Vector3(...p))
      if (!pts || pts.length < 2) continue
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
      const mat = new THREE.MeshStandardMaterial({ color: OVERLAY_BASE, roughness: 0.45, metalness: 0 })
      mat.userData.base = OVERLAY_BASE.clone()
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, TUBE_RADIUS, 10, false), mat)
      m.name = id
      m.renderOrder = 3
      g.add(m)
      meshes.set(id, [m])
      const mid = curve.getPoint(0.5)
      anchors.set(id, mid.clone().add(mid.clone().normalize().multiplyScalar(0.32)))
      ids.push(id)
    }
    return { group: g, meshes, anchors, ids }
  }, [base, pathSet, bpReady])
  useEffect(() => () => overlay.group.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose() }), [overlay])

  const placement = isolated ? ISOLATED_PLACEMENT : lad?.placement
  const { vesselMeshes, anchors } = useMemo(() => {
    const vm = new Map(base.vesselMeshes)
    overlay.meshes.forEach((v, k) => vm.set(k, v))
    const an = new Map<VesselId, THREE.Vector3>(overlay.anchors)
    base.vesselMeshes.forEach((ms, id) => { an.set(id, anchorOf(ms[0])) })
    if (bpReady && bp.group && placement) {
      const g = bp.group
      g.position.set(...placement.position)
      g.rotation.set(...(placement.rotationDeg.map((d) => (d * Math.PI) / 180) as Vec3))
      g.scale.setScalar(placement.scale)
      g.updateWorldMatrix(true, true)
      const ms: THREE.Mesh[] = []
      g.traverse((o) => { if ((o as THREE.Mesh).isMesh) ms.push(o as THREE.Mesh) })
      vm.set('LAD', ms)
      const c = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3())
      an.set('LAD', c.clone().add(c.clone().normalize().multiplyScalar(isolated ? 0.25 : 0.32)))
    }
    return { vesselMeshes: vm, anchors: an }
  }, [base, overlay, bpReady, bp.group, placement, isolated])

  // Configurable LAD base colour (shown when no prediction is loaded).
  useEffect(() => {
    if (!bpReady || !lad) return
    bp.group!.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) (m.material as THREE.MeshStandardMaterial).userData.base = new THREE.Color(lad.color)
    })
  }, [bpReady, bp.group, lad?.color])  // eslint-disable-line react-hooks/exhaustive-deps

  // Isolated inspection: show only the BodyParts3D LAD.
  useEffect(() => {
    base.root.visible = !isolated
    overlay.group.visible = !isolated
  }, [base, overlay, isolated])

  useEffect(() => {
    const r = inspectScene(base.root)
    VESSEL_IDS.forEach((id) => { if (overlay.meshes.has(id)) r.mapped[id] = true })
    if (bpReady) {
      r.mapped.LAD = true
      bp.segments?.forEach((sg) => r.meshes.push({ name: `LAD · ${sg.id} (BodyParts3D)`, parent: 'LAD_BP3D', vertices: sg.vertices, triangles: sg.triangles, material: '(generated)', size: [0, 0, 0], center: [0, 0, 0] }))
    }
    reportRef.current?.({ ...r, overlays: overlay.ids })
  }, [base, overlay, bpReady, bp.segments])
  useEffect(() => { document.body.style.cursor = hover || editVessel ? (editVessel ? 'crosshair' : 'pointer') : ''; return () => { document.body.style.cursor = '' } }, [hover, editVessel])

  // The scan is only pickable while placing vessel points.
  useEffect(() => {
    base.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.userData.pick) m.raycast = editVessel ? m.userData.pick : () => {} })
  }, [base, editVessel])

  const tmp = useMemo(() => new THREE.Color(), [])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    vesselMeshes.forEach((ms, id) => {
      const p = risks?.[id]
      const hasRisk = p != null
      const pulse = selected === id ? 0.12 * (0.5 + 0.5 * Math.sin(t * 4)) : 0
      for (const m of ms) {
        const mat = m.material as THREE.MeshStandardMaterial
        const baseC = mat.userData.base as THREE.Color
        if (hasRisk) {
          const [r, g, b] = riskRgb(p)
          tmp.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace)
        } else tmp.copy(baseC)
        let target = hasRisk ? VISUAL.emissiveMin + (VISUAL.emissiveMax - VISUAL.emissiveMin) * p : 0
        if (hover === id) target += VISUAL.hoverBoost
        if (selected === id) target += VISUAL.selectedBoost + pulse
        const k = 1 - Math.exp(-VISUAL.lerp * dt)
        mat.color.lerp(tmp, k)
        mat.emissive.lerp(hasRisk ? tmp : hover === id || selected === id ? baseC : BLACK, k)
        mat.emissiveIntensity += (target - mat.emissiveIntensity) * k
      }
    })
    if (group.current) {
      let s = 1
      if (heartbeat) {
        // lub-dub: two short pulses per beat
        const ph = (t * VISUAL.heartbeatBpm / 60) % 1
        const bump = (c: number, w: number) => Math.exp(-((ph - c) ** 2) / (2 * w * w))
        s += VISUAL.heartbeatAmplitude * (bump(0.1, 0.04) + 0.6 * bump(0.32, 0.05))
      }
      group.current.scale.setScalar(s)
    }
  })

  const vesselOf = (e: ThreeEvent<PointerEvent | MouseEvent>) => (editVessel ? undefined : meshToVessel.get(e.object.name))
  return (
    <group
      ref={group}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { const v = vesselOf(e); if (v) { e.stopPropagation(); setHover(v) } }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => { if (vesselOf(e)) setHover(null) }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (editVessel) {
          if (e.object.userData.pick && e.face) {
            e.stopPropagation()
            const n = e.face.normal.clone().transformDirection(e.object.matrixWorld)
            const p = e.point.clone().addScaledVector(n, 0.03)
            onEditPoint?.(editVessel, [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)])
          }
          return
        }
        const v = vesselOf(e)
        if (v) { e.stopPropagation(); onSelect(v) }
      }}
    >
      <primitive object={base.root} />
      <primitive object={overlay.group} />
      {bpReady && <primitive object={bp.group!} />}
      {editVessel && pathSet[editVessel]?.map((p, i) => (
        <mesh key={i} position={p}><sphereGeometry args={[0.04, 12, 12]} /><meshBasicMaterial color={i === 0 ? '#16a34a' : '#f59e0b'} depthTest={false} /></mesh>
      ))}
      {showLabels && !editVessel && VESSEL_IDS.filter((id) => !isolated || id === 'LAD').map((id) => {
        const a = anchors.get(id)
        return a ? <FloatingLabel key={id} id={id} anchor={a} risk={risks?.[id] ?? null} active={selected === id || hover === id} /> : null
      })}
    </group>
  )
}

/** Floating vessel tag with the model output; fades when the vessel is on the far side of the heart. */
function FloatingLabel({ id, anchor, risk, active }: { id: VesselId; anchor: THREE.Vector3; risk: number | null; active: boolean }) {
  const el = useRef<HTMLDivElement>(null)
  const { camera } = useThree()
  const dir = useMemo(() => anchor.clone().normalize(), [anchor])
  useFrame(() => {
    if (!el.current) return
    const facing = dir.dot(camera.position.clone().normalize())
    el.current.style.opacity = facing > 0.05 ? '1' : '0.18'
  })
  return (
    <Html position={anchor} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={el} className={`flex select-none items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-semibold shadow-md ring-1 transition-opacity ${
        active ? 'bg-navy-900 text-white ring-navy-900' : 'bg-white/95 text-navy-900 ring-line'}`}>
        {risk != null && <span className="h-2 w-2 rounded-full" style={{ background: riskColor(risk) }} />}
        {VESSELS[id].name}
        {risk != null && <span className="tabular-nums">{pct(risk)}</span>}
      </div>
    </Html>
  )
}

useGLTF.preload(MODEL_URL)
