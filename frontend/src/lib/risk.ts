/** One risk colour scale used by the 3D scene, cards, bars and legend. */
const STOPS: [number, [number, number, number]][] = [
  [0, [26, 163, 139]],   // low   - teal green
  [0.5, [240, 180, 41]], // mid   - amber
  [1, [214, 51, 74]],    // high  - red
]

export function riskRgb(p: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, p))
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i]
    const [p0, c0] = STOPS[i - 1]
    if (x <= p1) {
      const t = (x - p0) / (p1 - p0)
      return [0, 1, 2].map((k) => Math.round(c0[k] + (c1[k] - c0[k]) * t)) as [number, number, number]
    }
  }
  return STOPS[STOPS.length - 1][1]
}

export const riskColor = (p: number) => `rgb(${riskRgb(p).join(',')})`
export const riskGradientCss =
  `linear-gradient(90deg, ${riskColor(0)}, ${riskColor(0.5)}, ${riskColor(1)})`

export const pct = (p: number | null | undefined) =>
  p == null ? '—' : `${(p * 100).toFixed(p >= 0.995 || p === 0 ? 0 : 1)}%`
