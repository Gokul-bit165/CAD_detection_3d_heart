import * as THREE from 'three'
import { VESSELS, VESSEL_IDS } from './vesselConfig'
import type { VesselId } from '../../types/api'

export interface MeshInfo {
  name: string
  parent: string | null
  vertices: number
  triangles: number
  material: string
  size: [number, number, number]
  center: [number, number, number]
}

export interface SceneReport {
  meshes: MeshInfo[]
  /** Which configured vessels have all their meshes present in the scene. */
  mapped: Record<VesselId, boolean>
  /** Vessels drawn as approximate overlay tubes rather than separate meshes in the GLB. */
  overlays?: VesselId[]
  bounds: { min: [number, number, number]; max: [number, number, number] }
}

const arr = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z]

export function inspectScene(root: THREE.Object3D): SceneReport {
  root.updateWorldMatrix(true, true)
  const meshes: MeshInfo[] = []
  const all = new THREE.Box3()
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const box = new THREE.Box3().setFromObject(m)
    all.union(box)
    const g = m.geometry
    const mat = Array.isArray(m.material) ? m.material[0] : m.material
    meshes.push({
      name: m.name || '(unnamed)',
      parent: m.parent?.name || null,
      vertices: g.attributes.position?.count ?? 0,
      triangles: g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3,
      material: mat?.name || '(unnamed)',
      size: arr(box.getSize(new THREE.Vector3())),
      center: arr(box.getCenter(new THREE.Vector3())),
    })
  })
  const names = new Set(meshes.map((m) => m.name))
  const mapped = Object.fromEntries(
    VESSEL_IDS.map((id) => [id, VESSELS[id].meshNames.every((n) => names.has(n))]),
  ) as Record<VesselId, boolean>
  return { meshes, mapped, bounds: { min: arr(all.min), max: arr(all.max) } }
}
