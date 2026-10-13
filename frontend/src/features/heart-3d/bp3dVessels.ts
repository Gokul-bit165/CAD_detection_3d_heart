import type { VesselId } from '../../types/api'
import { BP3D_LAD, type Bp3dMode, type Placement } from './bp3dLad'
import { DEFAULT_PATHS, type Vec3 } from './vesselPaths'
import type { Bp3dState } from './useBp3dLad'

/**
 * Per-vessel BodyParts3D mesh sets. LAD is the original three-segment export (FMA74912); LCX and RCA come from the
 * BodyParts3D 4.0 PART-OF archive (see public/models/coronary/{LCX,RCA}/manifest.json for concept/representation ids,
 * bounds and limitations). All are millimetres in whole-body coordinates; no registration to the scan is implied.
 * Component order is by file id, not anatomical order, and the database does not state which component is proximal.
 */
export interface Bp3dVesselConfig {
  baseUrl: string
  concept: string
  segments: { id: string; file: string; role: string }[]
  defaultColor: string
}

export const BP3D_VESSELS: Record<VesselId, Bp3dVesselConfig> = {
  LAD: { baseUrl: BP3D_LAD.baseUrl, concept: 'FMA74912 Trunk of anterior interventricular branch of left coronary artery', segments: BP3D_LAD.segments, defaultColor: BP3D_LAD.defaultColor },
  LCX: {
    baseUrl: '/models/coronary/LCX/',
    concept: 'FMA3895 Circumflex branch of left coronary artery',
    defaultColor: '#e07a1f',
    segments: [
    { id: 'FJ2649', file: 'FJ2649.obj', role: "Circumflex branch of left coronary artery" },
    { id: 'FJ2650', file: 'FJ2650.obj', role: "Circumflex branch of left coronary artery" },
    { id: 'FJ2651', file: 'FJ2651.obj', role: "Circumflex branch of left coronary artery" },
    { id: 'FJ2652', file: 'FJ2652.obj', role: "Circumflex branch of left coronary artery" },
    { id: 'FJ2653', file: 'FJ2653.obj', role: "Circumflex branch of left coronary artery" },
    { id: 'FJ2654', file: 'FJ2654.obj', role: "Circumflex branch of left coronary artery" },
    ],
  },
  RCA: {
    baseUrl: '/models/coronary/RCA/',
    concept: 'FMA50039 Right coronary artery (trunk FMA3802 + branches)',
    defaultColor: '#7c3aed',
    segments: [
    { id: 'FJ2667', file: 'FJ2667.obj', role: "Marginal branch" },
    { id: 'FJ2668', file: 'FJ2668.obj', role: "Marginal branch" },
    { id: 'FJ2670', file: 'FJ2670.obj', role: "Right conus artery" },
    { id: 'FJ2671', file: 'FJ2671.obj', role: "First anterior ventricular branch" },
    { id: 'FJ2672', file: 'FJ2672.obj', role: "Marginal branch" },
    { id: 'FJ2673', file: 'FJ2673.obj', role: "First anterior ventricular branch" },
    { id: 'FJ2674', file: 'FJ2674.obj', role: "Marginal branch" },
    { id: 'FJ2675', file: 'FJ2675.obj', role: "Marginal branch" },
    { id: 'FJ2676', file: 'FJ2676.obj', role: "Right conus artery" },
    { id: 'FJ2677', file: 'FJ2677.obj', role: "First anterior ventricular branch" },
    { id: 'FJ2692', file: 'FJ2692.obj', role: "Posterior interventricular branch" },
    { id: 'FJ2693', file: 'FJ2693.obj', role: "Posterior interventricular branch" },
    { id: 'FJ2694', file: 'FJ2694.obj', role: "Posterior interventricular branch" },
    { id: 'FJ2695', file: 'FJ2695.obj', role: "Posterior interventricular branch" },
    { id: 'FJ2696', file: 'FJ2696.obj', role: "Posterior interventricular branch" },
    { id: 'FJ2697', file: 'FJ2697.obj', role: "Posterior interventricular branch" },
    { id: 'FJ2698', file: 'FJ2698.obj', role: "Posterior interventricular branch" },
    { id: 'FJ2699', file: 'FJ2699.obj', role: "Posterior interventricular branch" },
    { id: 'FJ2700', file: 'FJ2700.obj', role: "Posterior interventricular branch" },
    { id: 'FJ2714', file: 'FJ2714.obj', role: "First posterior ventricular branch" },
    { id: 'FJ2715', file: 'FJ2715.obj', role: "First posterior ventricular branch" },
    { id: 'FJ2716', file: 'FJ2716.obj', role: "First posterior ventricular branch" },
    { id: 'FJ2717', file: 'FJ2717.obj', role: "First posterior ventricular branch" },
    { id: 'FJ2718', file: 'FJ2718.obj', role: "First posterior ventricular branch" },
    { id: 'FJ2719', file: 'FJ2719.obj', role: "First posterior ventricular branch" },
    { id: 'FJ2720', file: 'FJ2720.obj', role: "First posterior ventricular branch" },
    { id: 'FJ2721', file: 'FJ2721.obj', role: "First posterior ventricular branch" },
    { id: 'FJ2722', file: 'FJ2722.obj', role: "First posterior ventricular branch" },
    { id: 'FJ2723', file: 'FJ2723.obj', role: "Trunk" },
    ],
  },
}

/** Per-vessel BodyParts3D display state held by the Explorer. */
export interface Bp3dVesselView {
  mode: Bp3dMode
  placement: Placement
  color: string
  /** Independent visibility of this vessel (seeded overlay or BodyParts3D). */
  visible: boolean
}

/** What the scene needs per vessel: the view state plus a loading-state callback. */
export type Bp3dViews = Partial<Record<VesselId, Bp3dVesselView & { onState?: (s: Bp3dState) => void }>>

const mid = (id: VesselId): Vec3 => {
  const p = DEFAULT_PATHS[id]
  const s = p.reduce((a, q) => [a[0] + q[0], a[1] + q[1], a[2] + q[2]], [0, 0, 0])
  return [+(s[0] / p.length).toFixed(2), +(s[1] / p.length).toFixed(2), +(s[2] / p.length).toFixed(2)]
}

/** Starting guess only (centre of the seeded path for LCX/RCA). Not a registration. */
export const DEFAULT_PLACEMENTS: Record<VesselId, Placement> = {
  LAD: { position: [0.05, -0.1, 0.55], rotationDeg: [0, 0, 0], scale: 1 },
  LCX: { position: mid('LCX'), rotationDeg: [0, 0, 0], scale: 1 },
  RCA: { position: mid('RCA'), rotationDeg: [0, 0, 0], scale: 1 },
}

const key = (id: VesselId) => (id === 'LAD' ? 'cardiovista.bp3dLadPlacement.v1' : `cardiovista.bp3d${id}Placement.v1`)

export function loadVesselView(id: VesselId): { placement: Placement; color: string } {
  const d = { placement: DEFAULT_PLACEMENTS[id], color: BP3D_VESSELS[id].defaultColor }
  try {
    const raw = localStorage.getItem(key(id))
    if (raw) {
      const p = JSON.parse(raw)
      return { placement: { ...d.placement, ...p.placement }, color: p.color ?? d.color }
    }
  } catch { /* ignore */ }
  return d
}

/** Forget every saved BodyParts3D placement/colour for all vessels. */
export function clearVesselViews() {
  for (const id of ['LAD', 'LCX', 'RCA'] as VesselId[]) {
    try { localStorage.removeItem(key(id)) } catch { /* ignore */ }
  }
}

export function saveVesselView(id: VesselId, placement: Placement, color: string) {
  try { localStorage.setItem(key(id), JSON.stringify({ placement, color })) } catch { /* ignore */ }
}
