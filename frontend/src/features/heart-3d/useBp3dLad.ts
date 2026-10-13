import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import type { VesselId } from '../../types/api'
import { BP3D_VESSELS } from './bp3dVessels'
import { BP3D_LAD } from './bp3dLad'

export interface Bp3dSegmentInfo {
  id: string
  role: string
  vertices: number
  triangles: number
  boundsMm: { min: [number, number, number]; max: [number, number, number] }
}

export interface Bp3dState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
  /** Outer group: apply the placement transform to this one. */
  group?: THREE.Group
  segments?: Bp3dSegmentInfo[]
}

function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    m.geometry.dispose()
    const mat = m.material
    ;(Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose())
  })
}

const toArr = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z]

/**
 * Loads one vessel's OBJ segments asynchronously and builds one group, recentred on the combined
 * bounding box (so rotation/scale act about the vessel's middle) and converted from mm to scene units.
 * Every segment mesh is named after the vessel id so the vessel mapping picks it up. Disposes on unmount/disable.
 * Any failed segment fails the whole vessel (the caller then keeps that vessel's seeded overlay).
 */
export function useBp3dVessel(id: VesselId, enabled: boolean): Bp3dState {
  const cfg = BP3D_VESSELS[id]
  const [state, setState] = useState<Bp3dState>({ status: 'idle' })

  useEffect(() => {
    if (!enabled) { setState((s) => (s.status === 'idle' ? s : { status: 'idle' })); return } // no-op when already idle: avoids needless re-renders
    let cancelled = false
    let built: THREE.Group | null = null
    setState({ status: 'loading' })
    const loader = new OBJLoader()
    Promise.all(cfg.segments.map((s) => loader.loadAsync(cfg.baseUrl + s.file)))
      .then((objs) => {
        if (cancelled) { objs.forEach(disposeTree); return }
        try {
        const inner = new THREE.Group()
        const infos: Bp3dSegmentInfo[] = []
        const all = new THREE.Box3()
        objs.forEach((obj, i) => {
          const seg = cfg.segments[i]
          let tris = 0
          const unique = new Set<string>() // OBJLoader un-indexes triangles; count distinct positions instead
          const box = new THREE.Box3()
          obj.traverse((o) => {
            const m = o as THREE.Mesh
            if (!m.isMesh) return
            const g = m.geometry as THREE.BufferGeometry
            if (!g.attributes.normal) g.computeVertexNormals()
            const pa = g.attributes.position
            for (let k = 0; k < pa.count; k++) unique.add(`${pa.getX(k).toFixed(4)},${pa.getY(k).toFixed(4)},${pa.getZ(k).toFixed(4)}`)
            tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3
            box.union(new THREE.Box3().setFromBufferAttribute(g.attributes.position as THREE.BufferAttribute))
            m.name = id
            m.userData.segment = seg.id
            m.material = new THREE.MeshStandardMaterial({ color: cfg.defaultColor, roughness: 0.45, metalness: 0, side: THREE.DoubleSide })
            ;(m.material as THREE.Material).userData.base = new THREE.Color(cfg.defaultColor)
          })
          const verts = unique.size
          if (!verts) throw new Error(`${seg.file} contains no mesh`)
          all.union(box)
          infos.push({ id: seg.id, role: seg.role, vertices: verts, triangles: tris, boundsMm: { min: toArr(box.min), max: toArr(box.max) } })
          inner.add(obj)
        })
        // recentre (mm), convert to scene units, and rotate BodyParts3D's z-up into the scan's y-up
        const c = all.getCenter(new THREE.Vector3())
        inner.children.forEach((o) => o.position.sub(c))
        inner.scale.setScalar(BP3D_LAD.unitsPerMm)
        inner.rotation.x = -Math.PI / 2
        built = new THREE.Group()
        built.name = `${id}_BP3D`
        built.add(inner)
        setState({ status: 'ready', group: built, segments: infos })
        } catch (e) { objs.forEach(disposeTree); throw e }
      })
      .catch((e: unknown) => { if (!cancelled) setState({ status: 'error', error: e instanceof Error ? e.message : `Failed to load the ${id} OBJ files` }) })

    return () => {
      cancelled = true
      if (built) disposeTree(built)
    }
  }, [id, cfg, enabled])

  return state
}

/** Back-compat wrapper for the original LAD-only hook. */
export const useBp3dLad = (enabled: boolean) => useBp3dVessel('LAD', enabled)
