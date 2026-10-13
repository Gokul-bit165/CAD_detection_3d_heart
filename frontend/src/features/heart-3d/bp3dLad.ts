import type { Vec3 } from './vesselPaths'

/**
 * BodyParts3D LAD trunk (FMA74912). Inspected, not assumed:
 *  - three OBJ files, one trunk cut into consecutive segments (adjacent ends ~0.04 mm apart, no duplicate geometry);
 *  - units are millimetres in BodyParts3D whole-body coordinates (z is height);
 *  - no .mtl / textures; open (not watertight) tubes with normals.
 * Order below is proximal -> distal, inferred from spatial continuity (decreasing z).
 */
export const BP3D_LAD = {
  baseUrl: '/models/coronary/LAD/',
  segments: [
    { id: 'MM420', file: 'MM420.obj', role: 'proximal segment' },
    { id: 'MM424', file: 'MM424.obj', role: 'middle segment' },
    { id: 'MM425', file: 'MM425.obj', role: 'distal segment' },
  ],
  /** Scene units per millimetre: the scan GLB is ~2.4 units for ~181 mm of source height. */
  unitsPerMm: 2.4 / 181,
  /** Default LAD colour when no prediction is loaded (a prediction colours it with the shared risk scale). */
  defaultColor: '#d62839',
  attribution: 'BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan.',
}

export type Bp3dMode = 'seeded' | 'overlay' | 'isolated'

/** Manual alignment of the BodyParts3D LAD onto the scan. NOT a registration: nothing here is verified. */
export interface Placement {
  position: Vec3
  rotationDeg: Vec3
  scale: number
}

// Starting guess only: BodyParts3D is z-up, the scan is y-up, so rotate -90 degrees about x, then
// sit the trunk near the seeded LAD start. The user must adjust it by eye.
/** LAD starting guess. Per-vessel placements live in bp3dVessels.ts. */
export const DEFAULT_PLACEMENT: Placement = { position: [0.05, -0.1, 0.55], rotationDeg: [0, 0, 0], scale: 1 }

/** Isolated inspection view: centred, enlarged, no relation to the heart. */
export const ISOLATED_PLACEMENT: Placement = { position: [0, 0.25, 0], rotationDeg: [0, 0, 0], scale: 2.6 }
