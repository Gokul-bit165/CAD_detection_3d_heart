import * as THREE from 'three'
import type { VesselId } from '../../types/api'

export type Vec3 = [number, number, number]

/**
 * Procedural heart anatomy (anterior view: patient's left is the viewer's right, +x right, +y up, +z toward viewer).
 * Chambers are tapered ellipsoids; the coronary arteries are defined by rough control points and then
 * projected onto the union of the chamber surfaces, so they lie on the heart instead of floating near it.
 */
export interface ChamberDef {
  id: string
  center: Vec3
  radii: Vec3
  rotZ: number // degrees
  taper: number // 0 = plain ellipsoid, >0 narrows towards -y (apex)
  color: string
  noise: number
}

export const CHAMBERS: ChamberDef[] = [
  { id: 'LV', center: [0.3, -0.15, -0.08], radii: [0.6, 0.95, 0.58], rotZ: 28, taper: 0.5, color: '#a63a3a', noise: 0.012 },
  { id: 'RV', center: [-0.36, -0.08, 0.2], radii: [0.5, 0.8, 0.4], rotZ: 20, taper: 0.4, color: '#b04a45', noise: 0.012 },
  { id: 'RA', center: [-0.64, 0.5, 0.0], radii: [0.36, 0.5, 0.36], rotZ: 0, taper: 0, color: '#9c3b44', noise: 0.01 },
  { id: 'RAA', center: [-0.38, 0.72, 0.3], radii: [0.2, 0.24, 0.14], rotZ: 35, taper: 0, color: '#9c3b44', noise: 0.008 },
  { id: 'LA', center: [0.34, 0.62, -0.4], radii: [0.5, 0.34, 0.36], rotZ: 0, taper: 0, color: '#9c3b44', noise: 0.01 },
  { id: 'LAA', center: [0.58, 0.58, 0.12], radii: [0.2, 0.15, 0.14], rotZ: -25, taper: 0, color: '#9c3b44', noise: 0.008 },
]

const T = (c: ChamberDef, y: number) => 1 - c.taper * Math.pow(Math.min(1, Math.max(0, -y / c.radii[1])), 1.4)

/** Chamber-local implicit value: <1 inside, 1 on the surface. */
export function chamberF(c: ChamberDef, p: THREE.Vector3): number {
  const a = (-c.rotZ * Math.PI) / 180
  const dx = p.x - c.center[0], dy = p.y - c.center[1], dz = p.z - c.center[2]
  const x = dx * Math.cos(a) - dy * Math.sin(a)
  const y = dx * Math.sin(a) + dy * Math.cos(a)
  const t = Math.max(0.12, T(c, y))
  return Math.hypot(x / (c.radii[0] * t), y / c.radii[1], dz / (c.radii[2] * t))
}

/** Surface mesh position for a unit-sphere direction (a,b,c) of a chamber. */
export function chamberPoint(c: ChamberDef, a: number, b: number, d: number, out = new THREE.Vector3()): THREE.Vector3 {
  const y = c.radii[1] * b
  const t = Math.max(0.12, T(c, y))
  const x = c.radii[0] * t * a
  const z = c.radii[2] * t * d
  const r = (c.rotZ * Math.PI) / 180
  return out.set(c.center[0] + x * Math.cos(r) - y * Math.sin(r), c.center[1] + x * Math.sin(r) + y * Math.cos(r), c.center[2] + z)
}

/** Project a point onto the union surface of all chambers, then lift it `lift` outward. */
export function projectToHeart(p: THREE.Vector3, lift = 0): THREE.Vector3 {
  const q = p.clone()
  for (let it = 0; it < 6; it++) {
    let best = CHAMBERS[0], bf = Infinity
    for (const c of CHAMBERS) { const f = chamberF(c, q); if (f < bf) { bf = f; best = c } }
    const ctr = new THREE.Vector3(...best.center)
    q.sub(ctr).multiplyScalar(1 / Math.max(0.05, bf)).add(ctr)
  }
  if (lift) {
    let best = CHAMBERS[0], bf = Infinity
    for (const c of CHAMBERS) { const f = chamberF(c, q); if (f < bf) { bf = f; best = c } }
    const e = 0.01, g = new THREE.Vector3(
      chamberF(best, q.clone().add(new THREE.Vector3(e, 0, 0))) - chamberF(best, q.clone().add(new THREE.Vector3(-e, 0, 0))),
      chamberF(best, q.clone().add(new THREE.Vector3(0, e, 0))) - chamberF(best, q.clone().add(new THREE.Vector3(0, -e, 0))),
      chamberF(best, q.clone().add(new THREE.Vector3(0, 0, e))) - chamberF(best, q.clone().add(new THREE.Vector3(0, 0, -e))),
    ).normalize()
    q.addScaledVector(g, lift)
  }
  return q
}

const v3 = (pts: Vec3[]) => pts.map((p) => new THREE.Vector3(...p))
const onHeart = (pts: Vec3[], lift: number) => pts.map((p) => projectToHeart(new THREE.Vector3(...p), lift))

// ---------------------------------------------------------------- coronary arteries
export interface ArteryDef {
  id: VesselId
  curve: THREE.CatmullRomCurve3
  r0: number // radius at the ostium
  r1: number // radius at the distal end
  /** Fractions along the artery where plaque tends to form (proximal-weighted, in order of severity). */
  plaqueAt: number[]
}

function artery(id: VesselId, ostium: Vec3, surface: Vec3[], r0: number, r1: number, plaqueAt: number[]): ArteryDef {
  const pts = [new THREE.Vector3(...ostium), ...onHeart(surface, r0 * 0.55)]
  return { id, curve: new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5), r0, r1, plaqueAt }
}

export const ARTERIES: Record<VesselId, ArteryDef> = {
  // Anterior interventricular groove, from the left main behind the pulmonary trunk down to the apex.
  LAD: artery('LAD', [0.06, 0.5, 0.0],
    [[0.2, 0.52, 0.2], [0.22, 0.34, 0.5], [0.3, 0.05, 0.62], [0.42, -0.32, 0.56], [0.55, -0.66, 0.44], [0.66, -0.95, 0.28], [0.74, -1.08, 0.1]],
    0.034, 0.014, [0.3, 0.5, 0.2, 0.7, 0.4]),
  // Left atrioventricular groove, wrapping round the left side to the back of the heart.
  LCX: artery('LCX', [0.04, 0.5, -0.02],
    [[0.34, 0.56, 0.2], [0.66, 0.5, 0.2], [0.9, 0.3, 0.02], [0.96, 0.0, -0.3], [0.84, -0.28, -0.52], [0.56, -0.4, -0.62]],
    0.03, 0.013, [0.3, 0.55, 0.2, 0.75, 0.45]),
  // Right atrioventricular groove, round the right border to the crux at the back.
  RCA: artery('RCA', [-0.06, 0.48, 0.06],
    [[-0.3, 0.46, 0.38], [-0.62, 0.3, 0.36], [-0.86, 0.04, 0.14], [-0.84, -0.3, -0.06], [-0.6, -0.62, -0.18], [-0.28, -0.78, -0.2]],
    0.032, 0.014, [0.3, 0.5, 0.7, 0.2, 0.4]),
}

// ---------------------------------------------------------------- great vessels (tubes)
export interface TubeDef { id: string; curve: THREE.CatmullRomCurve3; r0: number; r1: number; color: string; opacity: number }
const tube = (id: string, pts: Vec3[], r0: number, r1: number, color: string, opacity = 0.5): TubeDef =>
  ({ id, curve: new THREE.CatmullRomCurve3(v3(pts), false, 'centripetal'), r0, r1, color, opacity })

const OXY = '#d2514b', DEOXY = '#5b6fc4'
export const AORTA_PTS: Vec3[] = [[-0.02, 0.44, 0.0], [-0.05, 0.9, -0.05], [0.1, 1.28, -0.12], [0.42, 1.38, -0.24], [0.62, 1.1, -0.38], [0.62, 0.5, -0.5], [0.62, -0.2, -0.55]]
export const PA_PTS: Vec3[] = [[0.14, 0.52, 0.28], [0.2, 0.82, 0.2], [0.2, 1.0, 0.0]]
export const TUBES: TubeDef[] = [
  tube('aorta', AORTA_PTS, 0.15, 0.12, OXY),
  tube('brachio', [[0.06, 1.3, -0.12], [0.02, 1.55, -0.1]], 0.06, 0.05, OXY),
  tube('carotid', [[0.22, 1.36, -0.16], [0.2, 1.58, -0.14]], 0.045, 0.04, OXY),
  tube('subclavian', [[0.36, 1.38, -0.22], [0.5, 1.56, -0.2]], 0.05, 0.045, OXY),
  tube('pulm-trunk', PA_PTS, 0.13, 0.12, DEOXY),
  tube('pulm-left', [[0.2, 1.0, 0.0], [0.5, 1.06, -0.12], [0.86, 1.04, -0.3]], 0.085, 0.07, DEOXY),
  tube('pulm-right', [[0.2, 1.0, 0.0], [-0.1, 1.06, -0.14], [-0.52, 1.1, -0.26]], 0.085, 0.07, DEOXY),
  tube('svc', [[-0.64, 0.82, 0.0], [-0.64, 1.2, 0.0], [-0.64, 1.6, 0.0]], 0.1, 0.1, DEOXY),
  tube('ivc', [[-0.64, 0.2, -0.04], [-0.64, -0.3, -0.06], [-0.64, -0.7, -0.06]], 0.1, 0.1, DEOXY),
  tube('pv-l1', [[0.62, 0.7, -0.5], [0.95, 0.82, -0.62]], 0.055, 0.05, OXY),
  tube('pv-l2', [[0.58, 0.52, -0.52], [0.92, 0.5, -0.68]], 0.055, 0.05, OXY),
  tube('pv-r1', [[0.1, 0.72, -0.56], [-0.3, 0.84, -0.7]], 0.055, 0.05, OXY),
  tube('pv-r2', [[0.1, 0.52, -0.58], [-0.3, 0.5, -0.72]], 0.055, 0.05, OXY),
]

// ---------------------------------------------------------------- valves
export interface ValveDef { id: string; label: string; pos: Vec3; axis: Vec3; radius: number; leaflets: number; /** cardiac phase window in which it is open */ open: [number, number] }
export const VALVES: ValveDef[] = [
  { id: 'aortic', label: 'Aortic valve', pos: [-0.02, 0.46, 0.0], axis: [0, 1, 0], radius: 0.14, leaflets: 3, open: [0.03, 0.36] },
  { id: 'pulmonary', label: 'Pulmonary valve', pos: [0.14, 0.54, 0.28], axis: [0.05, 1, -0.15], radius: 0.13, leaflets: 3, open: [0.03, 0.36] },
  { id: 'mitral', label: 'Mitral valve', pos: [0.3, 0.3, -0.2], axis: [0.2, -1, 0.1], radius: 0.19, leaflets: 2, open: [0.4, 1.0] },
  { id: 'tricuspid', label: 'Tricuspid valve', pos: [-0.38, 0.28, 0.1], axis: [0.1, -1, 0.1], radius: 0.2, leaflets: 3, open: [0.4, 1.0] },
]

// ---------------------------------------------------------------- blood flow paths
export interface FlowDef { id: string; color: string; points: Vec3[]; count: number; speed: number; phase: 'systole' | 'diastole' | 'steady' }
export const FLOWS: FlowDef[] = [
  { id: 'deoxy-svc', color: '#4f6bdc', count: 26, speed: 0.11, phase: 'steady',
    points: [[-0.64, 1.55, 0], [-0.64, 0.85, 0], [-0.6, 0.5, 0.04], [-0.38, 0.28, 0.1], [-0.3, -0.05, 0.22], [-0.12, 0.3, 0.3], [0.14, 0.54, 0.28], [0.2, 0.82, 0.2], [0.2, 1.0, 0.0], [0.5, 1.06, -0.12], [0.86, 1.04, -0.3]] },
  { id: 'deoxy-ivc', color: '#4f6bdc', count: 18, speed: 0.11, phase: 'steady',
    points: [[-0.64, -0.65, -0.06], [-0.64, 0.2, -0.04], [-0.55, 0.4, 0.04], [-0.38, 0.28, 0.1], [-0.3, -0.05, 0.22], [-0.12, 0.3, 0.3], [0.14, 0.54, 0.28], [0.2, 0.82, 0.2], [0.2, 1.0, 0.0], [-0.1, 1.06, -0.14], [-0.52, 1.1, -0.26]] },
  { id: 'oxy-main', color: '#ff4a3d', count: 34, speed: 0.12, phase: 'steady',
    points: [[0.95, 0.8, -0.62], [0.62, 0.64, -0.5], [0.3, 0.3, -0.2], [0.34, -0.1, -0.12], [0.12, 0.22, -0.04], [-0.02, 0.46, 0.0], ...AORTA_PTS.slice(1)] },
  { id: 'oxy-right', color: '#ff4a3d', count: 14, speed: 0.12, phase: 'steady',
    points: [[-0.3, 0.84, -0.7], [0.05, 0.7, -0.56], [0.3, 0.3, -0.2]] },
]

export const HEART_CENTER = new THREE.Vector3(0.1, 0.25, 0)

export const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
/** Open fraction (0..1) of a valve with the given open window at cardiac phase `ph` (0..1). */
export function valveOpen(w: [number, number], ph: number): number {
  const e = 0.04
  return smooth(w[0], w[0] + e, ph) * (1 - smooth(w[1] - e, w[1], ph))
}
