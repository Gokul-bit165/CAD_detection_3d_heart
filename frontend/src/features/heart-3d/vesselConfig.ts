import type { VesselId } from '../../types/api'

export interface VesselConfig {
  id: VesselId
  name: string
  fullName: string
  territory: string // from the Track A primer
}

export const VESSELS: Record<VesselId, VesselConfig> = {
  LAD: { id: 'LAD', name: 'LAD', fullName: 'Left Anterior Descending', territory: 'Supplies blood to the front of the heart.' },
  LCX: { id: 'LCX', name: 'LCX', fullName: 'Left Circumflex', territory: 'Supplies blood to the side and back of the heart.' },
  RCA: { id: 'RCA', name: 'RCA', fullName: 'Right Coronary Artery', territory: 'Supplies blood to the right side and bottom of the heart.' },
}
export const VESSEL_IDS = Object.keys(VESSELS) as VesselId[]

export const VISUAL = {
  emissiveMin: 0.1,
  emissiveMax: 0.8,
  hoverBoost: 0.25,
  selectedBoost: 0.4,
  lerp: 5, // higher = faster colour transitions
  heartbeatBpm: 72,
  heartbeatAmplitude: 0.016,
}

export const MODEL_ATTRIBUTION = {
  description:
    'Procedurally generated anatomical heart (no external mesh): four chambers, great vessels, four animated valves and the three coronary arteries, which are projected onto the surface of the heart so they follow its grooves. Blood particles circulate through the chambers and coronaries.',
  licenceNote:
    'Generated in code, so there is no third-party asset or licence to track. It is a stylised teaching model, not patient-specific anatomy: damage markers show model output only, not a confirmed lesion location.',
  references: [
    { label: 'BodyParts3D (CC BY-SA 2.1 JP) - anatomy reference', url: 'https://lifesciencedb.jp/bp3d/' },
  ],
}
