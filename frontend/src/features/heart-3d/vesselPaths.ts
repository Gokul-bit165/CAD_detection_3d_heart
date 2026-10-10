import type { VesselId } from '../../types/api'

/**
 * Centre-lines of the LAD / LCX / RCA overlay, in the coordinate space of heart-scan.glb.
 *
 * The scan is ONE mesh (a photogrammetry specimen), so its arteries are not separate objects. These paths are an
 * APPROXIMATE overlay: seeded from standard anatomy (LAD in the anterior interventricular groove; LCX and RCA in the
 * atrioventricular groove on the left-ventricle / right-heart side) and NOT segmented from the scan. Refine them in
 * 3D Heart Explorer -> "Place vessels" (saved in this browser; paste the copied JSON here to make them permanent).
 */
export type Vec3 = [number, number, number]
export type VesselPaths = Record<VesselId, Vec3[]>

export const DEFAULT_PATHS: VesselPaths = {
  LAD: [[-0.023, -0.051, 0.737], [-0.236, -0.201, 0.776], [-0.394, -0.351, 0.746], [-0.526, -0.52, 0.687], [-0.527, -0.81, 0.202], [-0.624, -0.983, -0.008], [-0.69, -1.084, -0.247]],
  LCX: [[-0.166, 0.061, 0.668], [-0.255, -0.012, 0.299], [-0.395, 0.025, 0.12], [-0.459, -0.008, -0.096], [-0.427, -0.059, -0.335], [-0.347, -0.162, -0.561]],
  RCA: [[0.213, -0.219, 0.437], [0.307, -0.465, 0.384], [0.497, -0.736, 0.194], [0.539, -0.868, -0.213], [0.28, -0.798, -0.572], [-0.11, -0.737, -0.656], [-0.373, -0.751, -0.637]],
}

const KEY = 'cardiovista.vesselPaths.v1'

export function loadPaths(): VesselPaths {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<VesselPaths>
      return { LAD: p.LAD ?? DEFAULT_PATHS.LAD, LCX: p.LCX ?? DEFAULT_PATHS.LCX, RCA: p.RCA ?? DEFAULT_PATHS.RCA }
    }
  } catch { /* storage unavailable or corrupt: fall back */ }
  return DEFAULT_PATHS
}

export function savePaths(p: VesselPaths) {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* ignore */ }
}

export function resetPaths() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
