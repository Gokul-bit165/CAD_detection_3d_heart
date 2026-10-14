import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { VesselId } from '../../types/api'
import { riskRgb } from '../../lib/risk'
import { VISUAL, VESSEL_IDS } from './vesselConfig'
import { FloatingLabel, type Risks } from './ProceduralHeart'

export const MODEL_URL = '/models/heart-realistic.glb'

/** Camera-focus data read from the GLB's `focus_*` empties. */
export interface ModelFocus { center: THREE.Vector3; inside: THREE.Vector3; vessels: Record<VesselId, THREE.Vector3> }

interface Props {
  risks?: Risks
  selected: VesselId | null
  onSelect: (id: VesselId | null) => void
  heartbeat: boolean
  showLabels: boolean
  /** Ghost mode: translucent heart so the arteries on the back are visible too. */
  xray: boolean
  /** Plaque bulges on the arteries, sized by score. */
  damage: boolean
  onReady?: (f: ModelFocus) => void
}

const BLACK = new THREE.Color(0, 0, 0)
/** Where plaque forms along the artery (0 = ostium, 1 = distal), in order of severity. */
const SITES = [0.25, 0.45, 0.14, 0.62, 0.35]
const SIGMA = 0.035

interface ArteryRig {
  mesh: THREE.Mesh
  mat: THREE.MeshStandardMaterial
  pos0: Float32Array
  nrm: Float32Array
  along: Float32Array
  uniforms: { uTime: { value: number }; uSpeed: { value: number }; uPulse: { value: number } }
}

function rigArtery(mesh: THREE.Mesh): ArteryRig {
  const g = mesh.geometry as THREE.BufferGeometry
  const n = g.attributes.position.count
  const col = g.attributes.color
  const along = new Float32Array(n)
  for (let i = 0; i < n; i++) along[i] = col ? col.getX(i) : i / n
  g.setAttribute('aAlong', new THREE.BufferAttribute(along, 1))
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3))
  const old = mesh.material as THREE.MeshStandardMaterial
  const mat = new THREE.MeshStandardMaterial({ color: old.color.clone(), roughness: 0.38, metalness: 0, vertexColors: true })
  const uniforms = { uTime: { value: 0 }, uSpeed: { value: 0.3 }, uPulse: { value: 0 } }
  // Travelling "blood pulse": a bright band moving along each artery (slower and weaker as the score rises).
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aAlong;\nvarying float vAlong;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlong = aAlong;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uSpeed;\nuniform float uPulse;\nvarying float vAlong;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float w = fract(uTime * uSpeed);
        float d = vAlong - w;
        totalEmissiveRadiance += vec3(1.0, 0.62, 0.5) * exp(-d * d / (2.0 * 0.05 * 0.05)) * uPulse;`)
  }
  mesh.material = mat
  return {
    mesh, mat, along, uniforms,
    pos0: Float32Array.from(g.attributes.position.array as ArrayLike<number>),
    nrm: Float32Array.from(g.attributes.normal.array as ArrayLike<number>),
  }
}

/** Plaque bulge + tint for score p. Writes positions/colours in place. */
function applyDamage(r: ArteryRig, p: number | null, on: boolean) {
  const g = r.mesh.geometry as THREE.BufferGeometry
  const pos = g.attributes.position as THREE.BufferAttribute
  const col = g.attributes.color as THREE.BufferAttribute
  const n = pos.count
  const k = !on || p == null || p < 0.15 ? 0 : 1 + Math.floor(p * 4.99)
  const amp = 0.03 * (p ?? 0)
  for (let i = 0; i < n; i++) {
    let m = 0
    for (let s = 0; s < k; s++) { const d = r.along[i] - SITES[s]; m = Math.max(m, Math.exp(-(d * d) / (2 * SIGMA * SIGMA)) * (1 - s * 0.08)) }
    pos.setXYZ(i, r.pos0[i * 3] + r.nrm[i * 3] * amp * m, r.pos0[i * 3 + 1] + r.nrm[i * 3 + 1] * amp * m, r.pos0[i * 3 + 2] + r.nrm[i * 3 + 2] * amp * m)
    const t = Math.min(1, m * 1.4)
    col.setXYZ(i, 1, 1 - 0.1 * t, 1 - 0.45 * t) // nodules are paler / yellower than the vessel
  }
  pos.needsUpdate = true
  col.needsUpdate = true
  g.computeBoundingSphere()
}

export default function ScanHeart({ risks, selected, onSelect, heartbeat, showLabels, xray, damage, onReady }: Props) {
  const gltf = useGLTF(MODEL_URL)
  const group = useRef<THREE.Group>(null)
  const [hover, setHover] = useState<VesselId | null>(null)
  const readyRef = useRef(onReady)
  readyRef.current = onReady

  const { root, rigs, bodies, focus } = useMemo(() => {
    const root = gltf.scene.clone(true)
    const rigs = new Map<VesselId, ArteryRig>()
    const bodies: THREE.MeshStandardMaterial[] = []
    const pts: Record<string, THREE.Vector3> = {}
    root.updateWorldMatrix(true, true)
    root.traverse((o) => {
      if (o.name.startsWith('focus_')) pts[o.name] = o.getWorldPosition(new THREE.Vector3())
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      // glTF clones share geometry/material: copy so artery edits never touch the cached asset.
      m.geometry = m.geometry.clone()
      const id = VESSEL_IDS.find((v) => o.name === v)
      if (id) { rigs.set(id, rigArtery(m)); return }
      const mat = (m.material as THREE.MeshStandardMaterial).clone()
      mat.roughness = 0.82
      mat.metalness = 0
      m.material = mat
      m.raycast = () => {}
      bodies.push(mat)
    })
    const center = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3())
    const focus: ModelFocus = {
      center, inside: pts.focus_inside ?? center.clone(),
      vessels: { LAD: pts.focus_LAD ?? center, LCX: pts.focus_LCX ?? center, RCA: pts.focus_RCA ?? center },
    }
    return { root, rigs, bodies, focus }
  }, [gltf.scene])

  useEffect(() => { readyRef.current?.(focus) }, [focus])
  useEffect(() => () => rigs.forEach((r) => { r.mesh.geometry.dispose(); r.mat.dispose() }), [rigs])
  useEffect(() => () => bodies.forEach((m) => m.dispose()), [bodies])

  // Rebuild plaque bulges only when a score changes.
  const key = VESSEL_IDS.map((id) => (risks?.[id] == null ? '-' : Math.round((risks[id] as number) * 100))).join('|')
  useEffect(() => { rigs.forEach((r, id) => applyDamage(r, risks?.[id] ?? null, damage)) }, [rigs, key, damage])  // eslint-disable-line react-hooks/exhaustive-deps

  const tmp = useMemo(() => new THREE.Color(), [])
  const base = useMemo(() => new THREE.Color('#c0392b'), [])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const k = 1 - Math.exp(-VISUAL.lerp * dt)
    rigs.forEach((r, id) => {
      const p = risks?.[id] ?? null
      if (p != null) { const [a, b, c] = riskRgb(p); tmp.setRGB(a / 255, b / 255, c / 255, THREE.SRGBColorSpace) } else tmp.copy(base)
      let target = p != null ? VISUAL.emissiveMin + (VISUAL.emissiveMax - VISUAL.emissiveMin) * p : 0.05
      if (hover === id) target += VISUAL.hoverBoost
      if (selected === id) target += VISUAL.selectedBoost + 0.12 * (0.5 + 0.5 * Math.sin(t * 4))
      r.mat.color.lerp(tmp, k)
      r.mat.emissive.lerp(p != null ? tmp : BLACK, k)
      r.mat.emissiveIntensity += (target - r.mat.emissiveIntensity) * k
      r.uniforms.uTime.value = t
      r.uniforms.uSpeed.value = 0.32 * (1 - 0.7 * (p ?? 0))
      r.uniforms.uPulse.value = 0.55 * (1 - 0.5 * (p ?? 0))
    })
    const goal = xray ? 0.3 : 1
    for (const m of bodies) {
      m.transparent = xray || m.opacity < 0.99
      m.depthWrite = !xray
      m.opacity += (goal - m.opacity) * (1 - Math.exp(-6 * dt))
    }
    if (group.current) {
      let s = 1
      if (heartbeat) {
        const ph = (t * VISUAL.heartbeatBpm / 60) % 1
        const bump = (c: number, w: number) => Math.exp(-((ph - c) ** 2) / (2 * w * w))
        s += VISUAL.heartbeatAmplitude * (bump(0.1, 0.05) + 0.6 * bump(0.34, 0.06))
      }
      group.current.scale.setScalar(s)
    }
  })

  useEffect(() => { document.body.style.cursor = hover ? 'pointer' : ''; return () => { document.body.style.cursor = '' } }, [hover])

  const anchors = useMemo(() => Object.fromEntries(VESSEL_IDS.map((id) => [id, focus.vessels[id].clone().add(focus.vessels[id].clone().sub(focus.center).normalize().multiplyScalar(0.28))])) as Record<VesselId, THREE.Vector3>, [focus])
  const vesselOf = (e: ThreeEvent<PointerEvent | MouseEvent>) => ((VESSEL_IDS as string[]).includes(e.object.name) ? (e.object.name as VesselId) : undefined)
  return (
    <group ref={group}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { const v = vesselOf(e); if (v) { e.stopPropagation(); setHover(v) } }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => { if (vesselOf(e)) setHover(null) }}
      onClick={(e: ThreeEvent<MouseEvent>) => { const v = vesselOf(e); if (v) { e.stopPropagation(); onSelect(v) } }}>
      <primitive object={root} />
      {showLabels && VESSEL_IDS.map((id) => <FloatingLabel key={id} id={id} anchor={anchors[id]} risk={risks?.[id] ?? null} active={selected === id || hover === id} center={focus.center} />)}
    </group>
  )
}

useGLTF.preload(MODEL_URL)
