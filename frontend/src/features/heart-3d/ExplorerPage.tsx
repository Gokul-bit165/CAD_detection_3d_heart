import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Info, RotateCcw } from 'lucide-react'
import { Button, Card, CardHeader } from '../../components/ui'
import HeartScene from './LazyHeartScene'
import { severity } from './ProceduralHeart'
import { VESSELS, VESSEL_IDS } from './vesselConfig'
import { pct, riskColor } from '../../lib/risk'
import type { VesselId } from '../../types/api'

type Scores = Record<VesselId, number>

const SCENARIOS: { label: string; hint: string; scores: Scores }[] = [
  { label: 'Healthy', hint: 'All vessels low', scores: { LAD: 0.06, LCX: 0.05, RCA: 0.07 } },
  { label: 'Isolated LAD', hint: 'Anterior wall', scores: { LAD: 0.92, LCX: 0.21, RCA: 0.18 } },
  { label: 'RCA disease', hint: 'Inferior wall', scores: { LAD: 0.2, LCX: 0.3, RCA: 0.84 } },
  { label: 'Moderate multi-vessel', hint: 'Mixed severity', scores: { LAD: 0.58, LCX: 0.44, RCA: 0.66 } },
  { label: 'Triple-vessel', hint: 'Severe everywhere', scores: { LAD: 0.95, LCX: 0.91, RCA: 0.94 } },
]

export default function ExplorerPage() {
  const [selected, setSelected] = useState<VesselId | null>(null)
  const [scores, setScores] = useState<Scores>(SCENARIOS[1].scores)
  const [resetSignal, setResetSignal] = useState(0)
  const v = selected ? VESSELS[selected] : null

  return (
    <div className="space-y-5">
      {/* Demo Mode Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-info/30 bg-info-soft px-4 py-3 text-sm text-ink shadow-xs">
        <div className="flex items-center gap-2.5">
          <Info className="h-4 w-4 shrink-0 text-info" aria-hidden />
          <span>
            <strong className="font-semibold text-info">Demo mode:</strong> Interactive demo mode with manual inputs. For an actual assessment, see the Report.
          </span>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline shrink-0"
        >
          Open Report <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-ink">3D Heart Explorer</h2>
        <p className="mt-1 text-sm text-ink-3">
          Rotate, zoom and click an artery, or press the route button for a guided tour. Set manual damage scores below to see how each coronary artery looks at different severities � plaque grows, blood slows and the artery changes colour.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <HeartScene className="h-[480px] lg:h-[640px]" risks={scores} manual selected={selected} onSelect={setSelected} resetSignal={resetSignal} />
        <div className="space-y-4">
          <Card>
            <CardHeader title="Manual damage scores" subtitle="Drag a slider to simulate how severely each artery is affected" />
            <div className="space-y-4 p-5">
              {VESSEL_IDS.map((id) => (
                <div key={id}>
                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => setSelected(selected === id ? null : id)}
                      className={`font-semibold hover:underline ${selected === id ? 'text-accent' : 'text-ink'}`}
                    >
                      {VESSELS[id].name}
                    </button>
                    <span className="flex items-center gap-2 text-xs">
                      <span className="rounded-full px-2 py-0.5 font-medium text-white shadow-xs" style={{ background: riskColor(scores[id]) }}>
                        {severity(scores[id])}
                      </span>
                      <span className="w-10 text-right tabular-nums text-ink-2 font-medium">{pct(scores[id])}</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={scores[id]}
                    aria-label={`${id} damage score`}
                    className="mt-1.5 w-full accent-accent cursor-pointer"
                    onChange={(e) => setScores((s) => ({ ...s, [id]: Number(e.target.value) }))}
                  />
                </div>
              ))}
              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                {SCENARIOS.map((s) => (
                  <Button key={s.label} variant="secondary" title={s.hint} onClick={() => setScores(s.scores)}>
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
          <Card className="p-5" aria-live="polite">
            {v ? (
              <>
                <h3 className="text-base font-semibold text-ink">{v.name} � {v.fullName}</h3>
                <p className="mt-1 text-sm text-ink-3">{v.territory}</p>
                <p className="mt-3 text-xs text-ink-3/80">Territory descriptions are from the Track A challenge primer.</p>
              </>
            ) : (
              <p className="text-sm text-ink-3">Click LAD, LCX or RCA on the heart to fly to it and read what it supplies.</p>
            )}
          </Card>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setSelected(null); setResetSignal((n) => n + 1) }}>
              <RotateCcw className="h-4 w-4" /> Reset view
            </Button>
            <Link to="/assessment" className="flex-1">
              <Button className="w-full">Start a new assessment</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}