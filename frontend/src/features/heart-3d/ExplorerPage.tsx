import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, CircleDashed, Copy, Crosshair, Eraser, RotateCcw, Undo2 } from 'lucide-react'
import { Alert, Button, Card, CardHeader } from '../../components/ui'
import HeartScene from './LazyHeartScene'
import type { SceneReport } from './inspect'
import { MODEL_URL, VESSELS, VESSEL_IDS } from './vesselConfig'
import { loadPaths, resetPaths, savePaths, type Vec3, type VesselPaths } from './vesselPaths'
import type { VesselId } from '../../types/api'
import { BP3D_LAD, type Bp3dMode } from './bp3dLad'
import { BP3D_VESSELS, DEFAULT_PLACEMENTS, clearVesselViews, loadVesselView, saveVesselView, type Bp3dVesselView, type Bp3dViews } from './bp3dVessels'
import type { Bp3dState } from './useBp3dLad'
import type { Vec3 as V3 } from './vesselPaths'

const MODES: { id: Bp3dMode; label: string; hint: string }[] = [
  { id: 'seeded', label: 'Seeded overlay (default)', hint: 'Approximate tube drawn on the scan. Used on the results page.' },
  { id: 'overlay', label: 'BodyParts3D on scan', hint: 'Manual alignment by eye. Not a registration: position/orientation are unverified.' },
  { id: 'isolated', label: 'BodyParts3D isolated', hint: 'This vessel’s atlas segments alone, enlarged, for inspection. No heart.' },
]

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="grid grid-cols-[3.2rem_1fr_3.6rem] items-center gap-2 text-xs text-navy-500">
      {label}
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
      <span className="text-right tabular-nums text-navy-700">{value}</span>
    </label>
  )
}

export default function ExplorerPage() {
  const [selected, setSelected] = useState<VesselId | null>(null)
  const [report, setReport] = useState<SceneReport | null>(null)
  const [paths, setPaths] = useState<VesselPaths>(loadPaths)
  const [editing, setEditing] = useState<VesselId | null>(null)
  const [copied, setCopied] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)
  const v = selected ? VESSELS[selected] : null

  // BodyParts3D meshes: independent mode / visibility / colour / placement / load state per vessel.
  const [bpVessel, setBpVessel] = useState<VesselId>('LAD')
  const [views, setViews] = useState<Record<VesselId, Bp3dVesselView>>(() => {
    const init = (id: VesselId): Bp3dVesselView => ({ mode: 'seeded', visible: true, ...loadVesselView(id) })
    return { LAD: init('LAD'), LCX: init('LCX'), RCA: init('RCA') }
  })
  const [bpStates, setBpStates] = useState<Partial<Record<VesselId, Bp3dState>>>({})
  const handlers = useMemo(() => ({
    LAD: (s: Bp3dState) => setBpStates((p) => ({ ...p, LAD: s })),
    LCX: (s: Bp3dState) => setBpStates((p) => ({ ...p, LCX: s })),
    RCA: (s: Bp3dState) => setBpStates((p) => ({ ...p, RCA: s })),
  }), [])
  const patchView = (id: VesselId, patch: Partial<Bp3dVesselView>) => setViews((cur) => {
    const next = { ...cur, [id]: { ...cur[id], ...patch } }
    // Isolated inspection shows one vessel at a time (each mesh set is recentred on itself).
    if (patch.mode === 'isolated') VESSEL_IDS.forEach((o) => { if (o !== id && next[o].mode === 'isolated') next[o] = { ...next[o], mode: 'seeded' } })
    if (patch.placement || patch.color) saveVesselView(id, next[id].placement, next[id].color)
    return next
  })
  const bp3d = useMemo<Bp3dViews>(() => ({
    LAD: { ...views.LAD, onState: handlers.LAD }, LCX: { ...views.LCX, onState: handlers.LCX }, RCA: { ...views.RCA, onState: handlers.RCA },
  }), [views, handlers])
  /** Clear everything saved in this browser and return to the default view. */
  const resetAll = () => {
    resetPaths(); clearVesselViews()
    setPaths(loadPaths())
    setViews({ LAD: { mode: 'seeded', visible: true, ...loadVesselView('LAD') }, LCX: { mode: 'seeded', visible: true, ...loadVesselView('LCX') }, RCA: { mode: 'seeded', visible: true, ...loadVesselView('RCA') } })
    setBpVessel('LAD'); setEditing(null); setSelected(null); setResetSignal((n) => n + 1)
  }
  const bpView = views[bpVessel]
  const bpCfg = BP3D_VESSELS[bpVessel]
  const bp = bpStates[bpVessel] ?? { status: 'idle' as const }
  const setAxis = (key: 'position' | 'rotationDeg', i: number, val: number) => {
    const a = [...bpView.placement[key]] as V3; a[i] = val; patchView(bpVessel, { placement: { ...bpView.placement, [key]: a } })
  }

  const update = (next: VesselPaths) => { setPaths(next); savePaths(next) }
  const addPoint = (id: VesselId, p: Vec3) => update({ ...paths, [id]: [...paths[id], p] })

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold text-navy-900">3D Heart Explorer</h2>
        <p className="mt-1 text-sm text-navy-500">Rotate, zoom and select a coronary artery. No patient data is shown here — run an assessment to colour the vessels.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <HeartScene className="h-[480px] lg:h-[620px]" selected={selected} onSelect={setSelected} onReport={setReport}
          paths={paths} editVessel={editing} onEditPoint={addPoint} bp3d={bp3d} resetSignal={resetSignal} />
        <div className="space-y-4">
          <Button variant="secondary" className="w-full" onClick={resetAll}><RotateCcw className="h-4 w-4" /> Reset heart and vessels to defaults</Button>
          <Card className="p-5" aria-live="polite">
            {v ? (
              <>
                <h3 className="text-base font-semibold">{v.name} — {v.fullName}</h3>
                <p className="mt-1 text-sm text-navy-500">{v.territory}</p>
                <p className="mt-3 text-xs text-navy-500">Territory descriptions are from the Track A challenge primer.</p>
              </>
            ) : <p className="text-sm text-navy-500">Click LAD, LCX or RCA on the heart to read what it supplies.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {VESSEL_IDS.map((id) => (
                <Button key={id} variant={selected === id ? 'primary' : 'secondary'} onClick={() => setSelected(selected === id ? null : id)}>{id}</Button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Vessel models (BodyParts3D)" subtitle="Real atlas mesh segments for LAD, LCX and RCA; each vessel is configured independently" />
            <div className="space-y-3 p-5 text-sm">
              <div role="tablist" aria-label="BodyParts3D vessel" className="flex flex-wrap gap-2">
                {VESSEL_IDS.map((id) => {
                  const st = bpStates[id]?.status
                  return (
                    <Button key={id} variant={bpVessel === id ? 'primary' : 'secondary'} onClick={() => setBpVessel(id)} role="tab" aria-selected={bpVessel === id}>
                      {id} <span className="text-xs opacity-70">{views[id].mode === 'seeded' ? 'seeded' : st === 'ready' ? views[id].mode : st === 'error' ? 'error' : 'loading'}</span>
                    </Button>
                  )
                })}
              </div>
              <p className="text-xs text-navy-500">{bpCfg.concept} · {bpCfg.segments.length} mesh components</p>
              <label className="flex items-center gap-2 text-xs text-navy-700">
                <input type="checkbox" checked={bpView.visible} onChange={(e) => patchView(bpVessel, { visible: e.target.checked })} /> Show {bpVessel}
              </label>
              <div role="radiogroup" aria-label={`${bpVessel} source`} className="space-y-1.5">
                {MODES.map((m) => (
                  <label key={m.id} className={`flex cursor-pointer gap-2 rounded-lg border p-2.5 ${bpView.mode === m.id ? 'border-navy-900 bg-canvas' : 'border-line'}`}>
                    <input type="radio" name={`bp-mode-${bpVessel}`} checked={bpView.mode === m.id} onChange={() => { patchView(bpVessel, { mode: m.id }); setEditing(null) }} className="mt-1" />
                    <span><span className="font-medium text-navy-900">{m.label}</span><span className="block text-xs text-navy-500">{m.hint}</span></span>
                  </label>
                ))}
              </div>
              {bpView.mode !== 'seeded' && bp.status === 'loading' && <p className="text-xs text-navy-500">Loading {bpVessel} segments…</p>}
              {bpView.mode !== 'seeded' && bp.status === 'error' && <Alert tone="error" title={`${bpVessel} model failed to load`}>{bp.error}. The seeded {bpVessel} overlay is shown instead.</Alert>}
              {bpView.mode !== 'seeded' && bp.status === 'ready' && bp.segments && (
                <div className="max-h-52 overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-white text-navy-500"><tr><th className="py-1 font-medium">Segment</th><th className="font-medium">Verts</th><th className="font-medium">Tris</th><th className="font-medium">Length*</th></tr></thead>
                    <tbody>{bp.segments.map((sg) => (
                      <tr key={sg.id} className="border-t border-line"><td className="py-1.5 pr-3 font-medium">{sg.id} <span className="font-normal text-navy-500">{sg.role}</span></td><td className="pr-3 tabular-nums">{sg.vertices}</td><td className="pr-3 tabular-nums">{sg.triangles}</td>
                        <td>{Math.hypot(...(sg.boundsMm.max.map((m, i) => m - sg.boundsMm.min[i]) as V3)).toFixed(0)} mm</td></tr>))}</tbody>
                  </table>
                </div>
              )}
              {bpView.mode !== 'seeded' && (
                <label className="flex items-center gap-2 text-xs text-navy-500">{bpVessel} colour (no prediction)
                  <input type="color" value={bpView.color} onChange={(e) => patchView(bpVessel, { color: e.target.value })} aria-label={`${bpVessel} colour`} />
                </label>
              )}
              {bpView.mode === 'overlay' && (
                <div className="space-y-1.5 border-t border-line pt-3">
                  <p className="text-xs font-medium text-amber-900">Unverified alignment — adjust by eye, then judge for yourself.</p>
                  {(['X', 'Y', 'Z'] as const).map((a, i) => <Slider key={'p' + a} label={'Pos ' + a} value={bpView.placement.position[i]} min={-1.5} max={1.5} step={0.01} onChange={(val) => setAxis('position', i, val)} />)}
                  {(['X', 'Y', 'Z'] as const).map((a, i) => <Slider key={'r' + a} label={'Rot ' + a} value={bpView.placement.rotationDeg[i]} min={-180} max={180} step={1} onChange={(val) => setAxis('rotationDeg', i, val)} />)}
                  <Slider label="Scale" value={bpView.placement.scale} min={0.3} max={3} step={0.01} onChange={(val) => patchView(bpVessel, { placement: { ...bpView.placement, scale: val } })} />
                  <Button variant="ghost" onClick={() => patchView(bpVessel, { placement: DEFAULT_PLACEMENTS[bpVessel] })}><RotateCcw className="h-4 w-4" /> Reset alignment</Button>
                </div>
              )}
              <p className="text-xs leading-relaxed text-navy-500">
                *Bounding-box diagonal. These segments come from the generic BodyParts3D body atlas, not from your scan, and no landmarks link the two,
                so their relative placement cannot be verified here. Not a clinically validated segmentation. Source coordinates are millimetres in atlas space;
                LAD files come from an older BodyParts3D export than LCX/RCA (BodyParts3D 4.0), so their mutual placement is also unverified.
                Vessels left on “Seeded overlay” use the approximate tube. {BP3D_LAD.attribution}
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Place vessels" subtitle="The scan is one mesh, so the three arteries are an approximate overlay you can refine" />
            <div className="space-y-3 p-5 text-sm">
              <p className="text-[13px] leading-relaxed text-navy-500">
                Choose a vessel, then click along that artery on the heart (start at its origin at the aorta). Points are saved in this browser.
                The result is your best placement, not a segmentation of the scan.
              </p>
              <div className="flex flex-wrap gap-2">
                {VESSEL_IDS.map((id) => (
                  <Button key={id} variant={editing === id ? 'primary' : 'secondary'} onClick={() => { setEditing(editing === id ? null : id); setSelected(null) }}>
                    <Crosshair className="h-4 w-4" /> {id} <span className="text-xs opacity-70">({paths[id].length})</span>
                  </Button>
                ))}
              </div>
              {editing && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => update({ ...paths, [editing]: paths[editing].slice(0, -1) })} disabled={paths[editing].length === 0}><Undo2 className="h-4 w-4" /> Undo point</Button>
                  <Button variant="ghost" onClick={() => update({ ...paths, [editing]: [] })}><Eraser className="h-4 w-4" /> Clear {editing}</Button>
                </div>
              )}
              {editing && paths[editing].length < 2 && <Alert tone="warn">A vessel needs at least 2 points to be drawn.</Alert>}
              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                <Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(paths)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }}>
                  <Copy className="h-4 w-4" /> {copied ? 'Copied' : 'Copy paths JSON'}
                </Button>
                <Button variant="ghost" onClick={() => { resetPaths(); setPaths(loadPaths()); setEditing(null) }}><RotateCcw className="h-4 w-4" /> Restore seeded paths</Button>
              </div>
              <p className="text-xs text-navy-500">Paste the copied JSON into <code>DEFAULT_PATHS</code> in <code>vesselPaths.ts</code> to make it permanent for everyone.</p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Model inspector" subtitle={<>Scene contents of <code className="text-[12px]">{MODEL_URL}</code></>} />
            <div className="space-y-4 p-5">
              {!report ? <p className="text-sm text-navy-500">Waiting for the model to load…</p> : (
                <>
                  <ul className="space-y-1.5 text-sm">
                    {VESSEL_IDS.map((id) => (
                      <li key={id} className="flex items-center gap-2">
                        {report.mapped[id] ? <CheckCircle2 className="h-4 w-4 text-teal-brand" /> : <CircleDashed className="h-4 w-4 text-amber-600" />}
                        <span className="font-medium">{id}</span>
                        <span className="text-navy-500">
                          {!report.mapped[id] ? 'mapping pending — no mesh or overlay path'
                            : report.overlays?.includes(id) ? `→ overlay path (${paths[id].length} points, approximate)` : `→ mesh “${VESSELS[id].meshNames.join('”, “')}”`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-navy-500"><tr><th className="py-1 pr-3 font-medium">Mesh</th><th className="pr-3 font-medium">Verts</th><th className="pr-3 font-medium">Tris</th><th className="font-medium">Material</th></tr></thead>
                      <tbody>
                        {report.meshes.map((m) => (
                          <tr key={m.name} className="border-t border-line">
                            <td className="py-1.5 pr-3 font-medium text-navy-900">{m.name}</td><td className="pr-3">{m.vertices}</td><td className="pr-3">{m.triangles}</td><td>{m.material}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-navy-500">Bounds: min [{report.bounds.min.map((n) => n.toFixed(2)).join(', ')}] · max [{report.bounds.max.map((n) => n.toFixed(2)).join(', ')}]</p>
                </>
              )}
            </div>
          </Card>
          <Link to="/assessment"><Button className="w-full">Start a new assessment</Button></Link>
        </div>
      </div>
    </div>
  )
}
