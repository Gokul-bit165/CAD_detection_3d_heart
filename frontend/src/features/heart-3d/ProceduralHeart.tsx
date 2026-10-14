import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { VesselId } from '../../types/api'
import { pct, riskColor, riskRgb } from '../../lib/risk'
import { VESSELS, VESSEL_IDS, VISUAL } from './vesselConfig'
import { ARTERIES, CHAMBERS, FLOWS, HEART_CENTER, TUBES, VALVES, chamberPoint, smooth, valveOpen, type ArteryDef, type ChamberDef, type FlowDef, type TubeDef, type ValveDef } from './anatomy'

export type Risks = Partial<Record<VesselId, number | null>>

export const severity = (p: number) => (p >= 0.7 ? 'Severe' : p >= 0.5 ? 'Moderate' : p >= 0.3 ? 'Mild' : 'Minimal')

interface Props {
  risks?: Risks
  selected: VesselId | null
  onSelect: (id: VesselId | null) => void
  heartbeat: boolean
  showLabels: boolean
  /** Translucent chambers: shows valves and the blood passing through them. */
  xray: boolean
  /** 3D plaque / narrowing markers sized by each vessel's score. */
  damage: boolean
  /** Report the current cardiac phase (0..1) now and then, for the on-screen ECG-style readout. */
  phaseRef?: MutableRefObject<number>
}

const BLACK = new THREE.Color(0, 0, 0)
const FAT = new THREE.Color('#d8b25e')
const PLAQUE_COLOR = new THREE.Color('#ecdcae')

// ------------------------------------------------------------------ geometry helpers
function noise3(x: number, y: number, z: number) {
  return Math.sin(x * 9.1 + Math.sin(y * 5.3)) * Math.sin(y * 8.2 + Math.sin(z * 6.1)) * Math.sin(z * 7.3 + Math.sin(x * 4.7))
}

/** Radius-profile tube: TubeGeometry of unit radius, each ring rescaled about the curve. */
function buildTube(curve: THREE.CatmullRomCurve3, radius: (t: number) => number, segs = 96, radial = 14) {
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false)
  const pos = g.attributes.position as THREE.BufferAttribute
  const c = new THREE.Vector3(), v = new THREE.Vector3()
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, c)
    const r = radius(i / segs)
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c)
      pos.setXYZ(k, v.x, v.y, v.z)
    }
  }
  g.computeVertexNormals()
  return g
}

const sampleCurve = (c: THREE.Curve<THREE.Vector3>, n = 60) => Array.from({ length: n }, (_, i) => c.getPointAt(i / (n - 1)))
const FAT_LINES = VESSEL_IDS.flatMap((id) => sampleCurve(ARTERIES[id].curve, 70))

function buildChamber(def: ChamberDef) {
  const g = new THREE.SphereGeometry(1, 80, 60)
  const pos = g.attributes.position as THREE.BufferAttribute
  const col = new Float32Array(pos.count * 3)
  const base = new THREE.Color(def.color)
  const p = new THREE.Vector3(), c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const a = pos.getX(i), b = pos.getY(i), d = pos.getZ(i)
    chamberPoint(def, a, b, d, p)
    // organic surface relief, along the radial direction
    const n = def.noise * noise3(p.x, p.y, p.z)
    p.x += a * n; p.y += b * n; p.z += d * n
    pos.setXYZ(i, p.x, p.y, p.z)
    // epicardial fat pads hugging the coronary arteries
    let dmin = Infinity
    for (const q of FAT_LINES) { const dd = p.distanceToSquared(q); if (dd < dmin) dmin = dd }
    const fat = 1 - smooth(0.05, 0.14, Math.sqrt(dmin))
    c.copy(base).multiplyScalar(0.92 + 0.12 * noise3(p.x * 2, p.y * 2, p.z * 2)).lerp(FAT, fat * 0.65)
    col.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

function Chamber({ def, xray }: { def: ChamberDef; xray: boolean }) {
  const geo = useMemo(() => buildChamber(def), [def])
  const mat = useRef<THREE.MeshPhysicalMaterial>(null)
  useFrame((_, dt) => {
    if (!mat.current) return
    mat.current.opacity += ((xray ? 0.17 : 1) - mat.current.opacity) * (1 - Math.exp(-6 * dt))
  })
  return (
    <mesh geometry={geo} raycast={() => {}}>
      <meshPhysicalMaterial ref={mat} vertexColors roughness={0.55} clearcoat={0.4} clearcoatRoughness={0.45}
        transparent={xray} depthWrite={!xray} side={xray ? THREE.DoubleSide : THREE.FrontSide} />
    </mesh>
  )
}

function GreatVessel({ def, xray }: { def: TubeDef; xray: boolean }) {
  const geo = useMemo(() => buildTube(def.curve, (t) => def.r0 + (def.r1 - def.r0) * t, 40, 18), [def])
  return (
    <mesh geometry={geo} raycast={() => {}} renderOrder={1}>
      <meshPhysicalMaterial color={def.color} roughness={0.5} clearcoat={0.3} transparent opacity={xray ? 0.3 : def.opacity} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ------------------------------------------------------------------ valves
function Valve({ def, phase, xray, showLabels }: { def: ValveDef; phase: MutableRefObject<number>; xray: boolean; showLabels: boolean }) {
  const hinges = useRef<(THREE.Group | null)[]>([])
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...def.axis).normalize()), [def])
  const R = def.radius
  const alpha = (Math.PI / def.leaflets) * 0.9
  const leafletGeo = useMemo(() => { const g = new THREE.CircleGeometry(R * 0.97, 14, -alpha, alpha * 2); g.translate(-R * 0.97, 0, 0); return g }, [R, alpha])
  const portal = usePortal()
  useFrame(() => {
    const o = valveOpen(def.open, phase.current)
    const th = 0.12 + 1.0 * o
    hinges.current.forEach((h) => { if (h) h.rotation.y = th })
  })
  return (
    <group position={def.pos} quaternion={quat} visible={xray}>
      <mesh raycast={() => {}}><torusGeometry args={[R, 0.022, 10, 36]} /><meshStandardMaterial color="#d9b38c" roughness={0.5} /></mesh>
      {Array.from({ length: def.leaflets }, (_, i) => (
        <group key={i} rotation={[0, 0, (i * Math.PI * 2) / def.leaflets]}>
          <group position={[R, 0, 0]} ref={(el) => { hinges.current[i] = el }}>
            <mesh geometry={leafletGeo} raycast={() => {}}>
              <meshStandardMaterial color="#f2d6cc" roughness={0.6} side={THREE.DoubleSide} transparent opacity={0.92} />
            </mesh>
          </group>
        </group>
      ))}
      {xray && showLabels && (
        <Html position={[0, 0, 0]} portal={portal} center zIndexRange={[18, 0]} style={{ pointerEvents: 'none' }}>
          <div className="translate-y-9 whitespace-nowrap rounded-md bg-navy-900/85 px-1.5 py-0.5 text-[10px] font-medium text-white">{def.label}</div>
        </Html>
      )}
    </group>
  )
}

// ------------------------------------------------------------------ blood
function Blood({ curve, color, count, speed, phase, mode, size = 0.017 }: {
  curve: THREE.Curve<THREE.Vector3>; color: string; count: number; speed: number | (() => number)
  phase: MutableRefObject<number>; mode: FlowDef['phase'] | 'coronary'; size?: number
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const pts = useMemo(() => sampleCurve(curve, 240), [curve])
  const offs = useMemo(() => Array.from({ length: count }, (_, i) => ({ t: i / count, j: [Math.sin(i * 12.9) * 0.35, Math.cos(i * 7.7) * 0.35, Math.sin(i * 3.1) * 0.35] })), [count])
  const m4 = useMemo(() => new THREE.Matrix4(), [])
  const prog = useRef(0)
  useFrame((_, dt) => {
    const im = mesh.current
    if (!im) return
    const ph = phase.current
    const sys = smooth(0.02, 0.12, ph) * (1 - smooth(0.3, 0.4, ph))
    const mul = mode === 'steady' ? 0.75 + 0.7 * sys : mode === 'coronary' ? 0.35 + 0.65 * (1 - sys) : 1
    prog.current = (prog.current + dt * (typeof speed === 'function' ? speed() : speed) * mul) % 1
    offs.forEach((o, i) => {
      const t = (o.t + prog.current) % 1
      const f = t * (pts.length - 1), k = Math.floor(f), w = f - k
      const a = pts[k], b = pts[Math.min(k + 1, pts.length - 1)]
      const s = size * (0.8 + 0.4 * Math.sin(i * 5.1))
      m4.makeScale(s, s, s)
      m4.setPosition(a.x + (b.x - a.x) * w + o.j[0] * size, a.y + (b.y - a.y) * w + o.j[1] * size, a.z + (b.z - a.z) * w + o.j[2] * size)
      im.setMatrixAt(i, m4)
    })
    im.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false} raycast={() => {}} renderOrder={6}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  )
}

function usePortal() {
  const { gl } = useThree()
  // Stable DOM target: drei's Html otherwise re-creates its root whenever this changes identity.
  return useMemo(() => ({ current: gl.domElement.parentElement as HTMLElement }), [gl])
}

// ------------------------------------------------------------------ coronary arteries
function Artery({ def, p, damage, selected, hover, phase }: { def: ArteryDef; p: number | null; damage: boolean; selected: boolean; hover: boolean; phase: MutableRefObject<number> }) {
  const sites = useMemo(() => {
    const n = p == null || p < 0.15 ? 0 : 1 + Math.floor(p * 4.99)
    return def.plaqueAt.slice(0, n)
  }, [def, p])
  const geo = useMemo(() => buildTube(def.curve, (t) => def.r0 + (def.r1 - def.r0) * t), [def])
  const hit = useMemo(() => buildTube(def.curve, (t) => 0.05 - 0.02 * t, 48, 8), [def])
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const tmp = useMemo(() => new THREE.Color(), [])
  const base = useMemo(() => new THREE.Color('#c8433f'), [])
  useFrame(({ clock }, dt) => {
    const m = mat.current
    if (!m) return
    const has = p != null
    if (has) { const [r, g, b] = riskRgb(p); tmp.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace) } else tmp.copy(base)
    let target = has ? VISUAL.emissiveMin + (VISUAL.emissiveMax - VISUAL.emissiveMin) * p : 0.05
    if (hover) target += VISUAL.hoverBoost
    if (selected) target += VISUAL.selectedBoost + 0.12 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 4))
    const k = 1 - Math.exp(-VISUAL.lerp * dt)
    m.color.lerp(tmp, k)
    m.emissive.lerp(has ? tmp : BLACK, k)
    m.emissiveIntensity += (target - m.emissiveIntensity) * k
  })
  const flowSpeed = () => 0.09 * (1 - 0.7 * (p ?? 0))
  return (
    <group>
      <mesh geometry={geo} name={def.id} renderOrder={3}>
        <meshStandardMaterial ref={mat} color="#c8433f" roughness={0.4} />
      </mesh>
      <mesh geometry={hit} name={def.id}><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      {damage && p != null && sites.map((f, i) => <Plaque key={i} id={def.id} at={def.curve.getPointAt(f)} r={def.r0 + (def.r1 - def.r0) * f} p={p} index={i} />)}
      <Blood curve={def.curve} color={p != null && p > 0.6 ? '#ff7a6a' : '#ff4a3d'} count={Math.round(14 - 7 * (p ?? 0))} speed={flowSpeed} phase={phase} mode="coronary" size={0.009} />
    </group>
  )
}

/** One plaque nodule: grows in, glows with the vessel's score; severe ones pulse with a halo. */
function Plaque({ id, at, r, p, index }: { id: VesselId; at: THREE.Vector3; r: number; p: number; index: number }) {
  const body = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const col = useMemo(() => { const [a, b, c] = riskRgb(p); return new THREE.Color().setRGB(a / 255, b / 255, c / 255, THREE.SRGBColorSpace) }, [p])
  const size = r * (1.35 + 1.5 * p) * (1 - index * 0.05)
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const b = body.current
    if (b) { const k = 1 - Math.exp(-4 * dt); b.scale.set(b.scale.x + (size * 1.25 - b.scale.x) * k, b.scale.y + (size * 0.85 - b.scale.y) * k, b.scale.z + (size * 1.25 - b.scale.z) * k) }
    const h = halo.current
    if (h) { h.scale.setScalar(size * (2 + 0.35 * Math.sin(t * 3 + index))); (h.material as THREE.MeshBasicMaterial).opacity = 0.14 + 0.1 * Math.sin(t * 3 + index) }
  })
  return (
    <group position={at}>
      <mesh ref={body} name={id} scale={0.001} renderOrder={4}>
        <sphereGeometry args={[1, 20, 16]} />
        <meshStandardMaterial color={PLAQUE_COLOR} emissive={col} emissiveIntensity={0.3 + 0.6 * p} roughness={0.55} />
      </mesh>
      {p >= 0.6 && (
        <mesh ref={halo} raycast={() => {}} renderOrder={5}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshBasicMaterial color={col} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

/** Floating vessel tag with the score and a severity bar; fades when the vessel is on the far side of the heart. */
export function FloatingLabel({ id, anchor, risk, active, center = HEART_CENTER }: { id: VesselId; anchor: THREE.Vector3; risk: number | null; active: boolean; center?: THREE.Vector3 }) {
  const el = useRef<HTMLDivElement>(null)
  const { camera } = useThree()
  const portal = usePortal()
  const dir = useMemo(() => anchor.clone().sub(center).normalize(), [anchor, center])
  const cam = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    if (!el.current) return
    cam.copy(camera.position).sub(center).normalize()
    el.current.style.opacity = dir.dot(cam) > 0.05 ? '1' : '0.18'
  })
  return (
    <Html position={anchor} portal={portal} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={el} className={`flex select-none items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-semibold shadow-md ring-1 transition-opacity ${
        active ? 'bg-navy-900 text-white ring-navy-900' : 'bg-white/95 text-navy-900 ring-line'}`}>
        {risk != null && <span className="h-2 w-2 rounded-full" style={{ background: riskColor(risk) }} />}
        {VESSELS[id].name}
        {risk != null && <span className="tabular-nums">{pct(risk)}</span>}
        {risk != null && (
          <span className="flex flex-col gap-0.5">
            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-navy-900/15"><span className="block h-full rounded-full" style={{ width: `${Math.round(risk * 100)}%`, background: riskColor(risk) }} /></span>
            <span className="text-[9px] font-medium uppercase tracking-wide opacity-70">{severity(risk)}</span>
          </span>
        )}
      </div>
    </Html>
  )
}

// ------------------------------------------------------------------ the heart
export default function ProceduralHeart({ risks, selected, onSelect, heartbeat, showLabels, xray, damage, phaseRef }: Props) {
  const group = useRef<THREE.Group>(null)
  const localPhase = useRef(0)
  const phase = phaseRef ?? localPhase
  const [hover, setHover] = useState<VesselId | null>(null)
  const flows = useMemo(() => FLOWS.map((f) => ({ f, curve: new THREE.CatmullRomCurve3(f.points.map((p) => new THREE.Vector3(...p)), false, 'centripetal') })), [])
  const anchors = useMemo(() => Object.fromEntries(VESSEL_IDS.map((id) => {
    const m = ARTERIES[id].curve.getPointAt(0.5)
    return [id, m.clone().add(m.clone().sub(HEART_CENTER).normalize().multiplyScalar(0.3))]
  })) as Record<VesselId, THREE.Vector3>, [])

  useEffect(() => { document.body.style.cursor = hover ? 'pointer' : ''; return () => { document.body.style.cursor = '' } }, [hover])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    phase.current = (t * VISUAL.heartbeatBpm / 60) % 1
    if (!group.current) return
    let s = 1
    if (heartbeat) {
      const ph = phase.current
      const bump = (c: number, w: number) => Math.exp(-((ph - c) ** 2) / (2 * w * w))
      s += VISUAL.heartbeatAmplitude * (bump(0.1, 0.05) + 0.6 * bump(0.34, 0.06))
    }
    group.current.scale.setScalar(s)
  })

  const vesselOf = (e: ThreeEvent<PointerEvent | MouseEvent>) => (VESSEL_IDS as string[]).includes(e.object.name) ? (e.object.name as VesselId) : undefined
  return (
    <group ref={group}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { const v = vesselOf(e); if (v) { e.stopPropagation(); setHover(v) } }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => { if (vesselOf(e)) setHover(null) }}
      onClick={(e: ThreeEvent<MouseEvent>) => { const v = vesselOf(e); if (v) { e.stopPropagation(); onSelect(v) } }}>
      {CHAMBERS.map((c) => <Chamber key={c.id} def={c} xray={xray} />)}
      {TUBES.map((t) => <GreatVessel key={t.id} def={t} xray={xray} />)}
      {VALVES.map((v) => <Valve key={v.id} def={v} phase={phase} xray={xray} showLabels={showLabels} />)}
      {flows.map(({ f, curve }) => <Blood key={f.id} curve={curve} color={f.color} count={f.count} speed={f.speed} phase={phase} mode={f.phase} />)}
      {VESSEL_IDS.map((id) => (
        <Artery key={id} def={ARTERIES[id]} p={risks?.[id] ?? null} damage={damage} selected={selected === id} hover={hover === id} phase={phase} />
      ))}
      {showLabels && VESSEL_IDS.map((id) => <FloatingLabel key={id} id={id} anchor={anchors[id]} risk={risks?.[id] ?? null} active={selected === id || hover === id} />)}
    </group>
  )
}
