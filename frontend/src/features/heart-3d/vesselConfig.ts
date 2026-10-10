import type { VesselId } from '../../types/api'

export const MODEL_URL: string =
  (import.meta.env.VITE_3D_MODEL_PATH as string | undefined) ?? '/models/heart-scan.glb'

/**
 * Vessel -> mesh mapping, verified by inspecting coronary-heart.glb (nodes are named
 * Heart_Body, Aorta, LAD, LCX, RCA; each vessel is its own mesh with its own material).
 * If a different GLB is dropped in, edit `meshNames` here after running the Explorer's
 * "Model inspector". Vessels whose meshes are not found render as "mapping pending".
 */
export interface VesselConfig {
  id: VesselId
  name: string
  fullName: string
  meshNames: string[]
  territory: string // from the Track A primer
}

export const VESSELS: Record<VesselId, VesselConfig> = {
  LAD: { id: 'LAD', name: 'LAD', fullName: 'Left Anterior Descending', meshNames: ['LAD'], territory: 'Supplies blood to the front of the heart.' },
  LCX: { id: 'LCX', name: 'LCX', fullName: 'Left Circumflex', meshNames: ['LCX'], territory: 'Supplies blood to the side and back of the heart.' },
  RCA: { id: 'RCA', name: 'RCA', fullName: 'Right Coronary Artery', meshNames: ['RCA'], territory: 'Supplies blood to the right side and bottom of the heart.' },
}
export const VESSEL_IDS = Object.keys(VESSELS) as VesselId[]


/** Non-selectable context anatomy. */
export const CONTEXT_MESHES = ['Heart_Body', 'Aorta']

/** Opacity of the non-selectable shells so the vessels inside remain visible. */
export const CONTEXT_OPACITY: Record<string, number> = { Heart_Body: 0.28, Aorta: 0.55 }

/** Visual scale: probability -> emissive strength of the vessel material. */
export const VISUAL = {
  emissiveMin: 0.12,
  emissiveMax: 0.85,
  hoverBoost: 0.25,
  selectedBoost: 0.4,
  lerp: 5, // higher = faster colour transitions
  heartbeatBpm: 72,
  heartbeatAmplitude: 0.014,
}

export const MODEL_ATTRIBUTION = {
  file: 'frontend/public/models/heart-scan.glb',
  generator: 'Derived from FinalHeartScan3dec.obj (Sketchfab "3D digital model of coronary arteries")',
  description:
    'Photogrammetry scan of a specimen heart, decimated to ~200k triangles with the colours sampled from the supplied texture. It is a single mesh: the LAD, LCX and RCA are NOT separate objects in it.',
  orientationNote:
    'The coloured LAD, LCX and RCA tubes are an approximate overlay placed from standard anatomy (not segmented from the scan, and not the exact course of the arteries of this specimen). They can be refined in 3D Heart Explorer ("Place vessels"). The scan appears to be a dissected specimen with the atria/back side poorly captured.',
  licenceNote:
    'The licence of the Sketchfab source model has not been verified. The derived GLB is git-ignored; confirm the licence and required attribution before redistributing it.',
  references: [
    { label: 'Sketchfab coronary artery model (source of the scan)', url: 'https://sketchfab.com/3d-models/3d-digital-model-of-coronary-arteries-cb63e7714a574984835160530957748b' },
    { label: 'BodyParts3D (CC BY-SA 2.1 JP) - anatomy reference', url: 'https://lifesciencedb.jp/bp3d/' },
    { label: 'BodyParts3D licence', url: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html' },
  ],
}
