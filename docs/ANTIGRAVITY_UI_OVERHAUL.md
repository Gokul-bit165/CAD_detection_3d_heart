# ANTIGRAVITY — CardioVista UI Overhaul (your half of the work)

> Give this whole file to Antigravity. The **prompt to paste** is in section 0; everything after it is the
> specification the prompt tells it to read. Do not paraphrase either of them.

---

## 0. PROMPT TO PASTE INTO ANTIGRAVITY

```text
You are a senior front-end engineer joining an existing, working React project called CardioVista (a
coronary-artery-disease risk app used by clinicians and shown to competition judges). Another engineer
(Claude) is working in parallel on the backend and on the 3D heart component. You own the rest of the
frontend.

READ FIRST, IN FULL, BEFORE WRITING ANY CODE:
1. docs/ANTIGRAVITY_UI_OVERHAUL.md  (this specification: it is binding)
2. docs/PLAN_UI_OVERHAUL.md         (master plan; sections 0, 3, 5, 6 are binding for you)
3. The files listed in section 2 of the specification ("Existing code you must understand").

HARD RULES (violating any of these means the work is rejected):
- Edit ONLY the files in the "You own" list. NEVER edit anything under backend/, and NEVER edit
  frontend/src/features/heart-3d/HeartScene.tsx, ScanHeart.tsx, ProceduralHeart.tsx, LazyHeartScene.tsx
  (read them, do not change them). If you need a change there, append it to section 9 of
  docs/PLAN_UI_OVERHAUL.md under "Requests to the other side" and continue with a workaround.
- Do not rename or remove any existing route path, API call, exported function used elsewhere, or
  localStorage/sessionStorage key ('cardiovista.assessment.draft').
- The API contract in section 3 of the specification is the single source of truth for new fields.
  All new fields are OPTIONAL at runtime: old saved predictions will not have them. Never assume
  `findings`, `explanation`, `ref_low`, `ref_high` exist.
- This is a medical-adjacent UI. Follow the wording rules in section 6 exactly. Never write
  "the patient has CAD". Never claim causation. Never imply the contribution values add up to the
  probability. Never invent clinical numbers.
- No new runtime dependencies except `motion` (the framer-motion successor). Use the existing
  recharts, lucide-react, tailwind v4. No UI kits.
- Light AND dark theme must both be correct on every screen you touch. No hard-coded colours left
  (grep checklist in section 4.8).
- Respect prefers-reduced-motion everywhere.
- Work in the order of section 8 and commit after each step with message "ui: <step name>".
  Run `npm run typecheck` and `npm run build` in frontend/ after each step; fix before continuing.
- Do not delete files. Do not reformat unrelated code. Do not "improve" things outside this spec.
- If anything in the spec is ambiguous, choose the more conservative option, write the assumption in
  section 9 of docs/PLAN_UI_OVERHAUL.md, and keep going. Do not stop to ask.

DELIVERABLE: all steps of section 8 finished, the acceptance checklist of section 9 ticked with evidence
(screenshots of /results/<id> in light and dark at 1440x900 and 390x844 saved in docs/screenshots/), and a
short summary listing every file you changed.
```

---

## 1. Project context (so you do not guess)

**What the app is.** CardioVista predicts, from clinical measurements only (no imaging), the probability of
coronary artery disease (CAD) overall and for three arteries: **LAD**, **LCX**, **RCA**. The backend returns
probabilities, a per-target decision threshold, and a reliability tier. A 3D anatomical heart colours/animates the
arteries by score.

**Who looks at it.** (1) Competition validators who spend ~30 seconds and judge "is this a real model or a mock?".
(2) Doctors and patients reading one report together. Therefore: the **Assessment Report** must be the first thing seen,
must be information-rich, and must explain *why* the model gave its answer.

**Stack.** React 19, Vite, TypeScript, Tailwind CSS v4 (tokens declared in `@theme` inside `frontend/src/index.css`),
react-router-dom 7, recharts 3, lucide-react, three/@react-three/fiber/drei (3D is NOT yours).

**Backend base URL.** `VITE_API_BASE_URL` or `http://localhost:8000/api/v1` (see `services/api.ts`).
Run: backend `uvicorn app.main:app --reload` from `backend/` (check README); frontend `npm run dev` in `frontend/`.

**Parallel work by Claude (not yours, do not touch):**
- Backend: per-target feature explanations, `findings`, `ref_low/ref_high`, CSV import endpoint.
- `HeartScene` (3D): bigger auto-fit canvas, automatic findings tour, healthy-reference picture-in-picture, theme-aware background.

Until the backend lands, build against fixtures (section 5). Switching to the real API must need **zero** code changes except
removing the fixture flag.

---

## 2. Existing code you must understand before starting

Read these fully:

| File | Why |
|---|---|
| `frontend/src/index.css` | Tailwind v4 `@theme` tokens (`navy-*`, `line`, `canvas`, `teal-*`, `blue-brand`). Currently light-only. |
| `frontend/src/components/ui.tsx` | `Card`, `CardHeader`, `Button`, `Badge`, `Spinner`, `EmptyState`, `Alert`, `cx`. Uses `bg-white`, `text-white`, `navy-*`. |
| `frontend/src/app/AppShell.tsx` | Sidebar `NAV` array, header, sticky disclaimer footer. |
| `frontend/src/app/App.tsx`, `AppData.tsx` | Routes; `useAppData()` gives `schema`, `modelInfo`, `apiOnline`. |
| `frontend/src/features/predictions/ResultsPage.tsx` | The report. Has the hard-coded `h-[420px] lg:h-[530px]` 3D height and 2-column layout. |
| `.../predictions/ResultCards.tsx` | `OverallCard`, `VesselCards`, `VesselDetail`, `ProbabilityBar`, `ReliabilityBadge`. Reuse pieces. |
| `.../predictions/InputSummary.tsx` | Groups inputs by `schema.groups`; `displayValue()` is reusable. |
| `.../explainability/ExplainabilityPanel.tsx` | Existing contribution bars (only shows if `explanation` present). |
| `.../patient-assessment/AssessmentPage.tsx`, `validation.ts`, `FieldControl.tsx` | The form; on submit calls `api.createPrediction(toPayload(schema, values))` then `navigate('/results/'+id)`. Draft is persisted in `sessionStorage['cardiovista.assessment.draft']`. |
| `.../import/ImportPage.tsx` | Existing xlsx batch import: upload → `api.importExcel` → table → predict all. Study how it predicts row by row. |
| `.../dashboard/OverviewPage.tsx`, `history/HistoryPage.tsx` | Overview stats and history table. |
| `frontend/src/lib/risk.ts` | Single risk colour scale (`riskColor`, `riskGradientCss`, `pct`). Keep as the only source of risk colours. |
| `frontend/src/types/api.ts`, `services/api.ts` | Types and API client. |
| `frontend/src/features/heart-3d/HeartScene.tsx` | READ ONLY. Know its props (section 3.3). Used as `<HeartScene .../>` from `LazyHeartScene`. |

---

## 3. API contract (binding)

### 3.1 Types — paste into `frontend/src/types/api.ts` verbatim in Step 0

```ts
export type FindingStatus = 'stenotic' | 'normal'
export type Severity = 'mild' | 'moderate' | 'severe'

export interface VesselFinding {
  vessel: VesselId
  status: FindingStatus
  probability: number            // 0..1
  threshold: number              // this vessel's own tuned threshold
  severity: Severity | null      // null when normal
  reliability: 'good' | 'moderate' | 'low' | null
  rank: number                   // 1 = most severe; stenotic first, then normal
}
// add to PredictionResponse:   findings?: VesselFinding[] | null
// add to Explanation:          baselines?: Partial<Record<TargetId, number>>
// add to FeatureSpec:          ref_low?: number | null;  ref_high?: number | null
```

### 3.2 Semantics you must respect

- `Explanation.contributions[]` now contains entries for **all four targets** (`CAD`, `LAD`, `LCX`, `RCA`), each with `target`. Filter by `target`. Up to 10 per target, already sorted by `|contribution|` descending.
- `contribution` is in **probability units**: `0.12` means "+12 percentage points". Show as "+12 pts" (or "+12 %pts"), never as a bare "%".
- Meaning: *"how much the model's output would change if this one input had been the typical value instead."* **Not additive.** Do **not** draw a waterfall that sums to the probability. Use a diverging bar chart.
- Positive = pushes toward disease (red family). Negative = pushes toward normal (blue/teal family). Describes model behaviour, not causes.
- `VesselFinding.status === 'stenotic'` means the vessel's probability is at/above that vessel's own threshold.
- `reliability === 'low'` must always be visibly shown next to that vessel (LCX and RCA are weak models).
- `FeatureSpec.ref_low/ref_high` are numeric bounds or `null`. If both null, there is no reference range: show the value without a band.

### 3.3 Endpoints

- Existing, unchanged: `GET /health`, `/model-info`, `/features`, `POST /predictions`, `GET /predictions`, `GET /predictions/{id}`, `GET /evaluation`.
- New: `POST /import/file` (multipart `file`, `.csv` or `.xlsx`) returning the same `ImportResponse` as `/import/excel`. `GET /import/template.csv`.
- Add to `services/api.ts`: `importFile(file)` → `POST /import/file`; `templateCsvUrl`. Keep `importExcel` and `templateUrl` working (the old endpoints stay).

### 3.4 `HeartScene` props you can use (Claude is implementing; ignore until it lands, but wire them now)

```tsx
<HeartScene
  className="h-[clamp(560px,78vh,900px)]"   // you decide the size; give it a real height
  risks={risks}                              // Record<VesselId, number|null>, as in the current ResultsPage
  selected={selected}  onSelect={setSelected}
  resetSignal={resetCount}
  findings={data.findings ?? undefined}      // new, optional
  onTourStep={setTourStep}                   // new, optional: ({index,total,vessel,status} | null) => void
/>
```
Unknown props are harmless today, so you can pass them already. Use `tourStep.vessel` to highlight the matching vessel card and driver chart target. Theme: the scene reads `document.documentElement.dataset.theme` by itself; you only have to set that attribute.

---

## 4. What you must build

### 4.1 Theme system (light + dark) — request 3

1. **Tokens.** In `index.css` keep Tailwind v4 `@theme` but introduce **semantic** tokens backed by CSS variables, and define both themes:
   - Surfaces: `--surface` (cards), `--surface-2` (inset/secondary), `--canvas` (page bg), `--line`.
   - Text: `--ink` (primary), `--ink-2` (secondary), `--ink-3` (muted).
   - Brand/status: `--accent` (teal), `--accent-soft`, `--info`, `--danger`, `--danger-soft`, `--warn`, `--warn-soft`, `--ok`, `--ok-soft`.
   - Expose them to Tailwind as utilities: `bg-surface`, `bg-surface-2`, `bg-canvas`, `text-ink`, `text-ink-2`, `text-ink-3`, `border-line`, `bg-accent-soft`, `text-danger`, etc.
   - Light values: take the current look (canvas `#f6f8fa`, line `#e3e8ee`, navy ink). Dark values: canvas `#0b1220`, surface `#111a2b`, surface-2 `#17233a`, line `#24334d`, ink `#e6edf7`, ink-2 `#aebbd0`, ink-3 `#7d8ca6`, accent teal `#2dd4bf`, danger `#f87171`, warn `#fbbf24`, ok `#34d399`, info `#60a5fa`. Adjust only if a contrast check fails.
   - Selector: `:root` = light, `:root[data-theme='dark']` = dark. Also `color-scheme: light|dark` so native inputs/scrollbars follow.
2. **Provider.** Create `frontend/src/app/theme.tsx`: `ThemeProvider`, `useTheme(): { theme: 'light'|'dark'; preference: 'light'|'dark'|'system'; setPreference; toggle }`. Persist in `localStorage['cardiovista.theme']` (wrap in try/catch), default `system` via `matchMedia('(prefers-color-scheme: dark)')` with live updates. Sets `document.documentElement.dataset.theme`.
3. **No flash.** Add a tiny inline script in `frontend/index.html` `<head>` that sets `data-theme` before first paint using the same logic.
4. **Toggle.** Sun/moon icon button in the header (right side, next to the model status badge), `aria-label="Switch to dark theme"` (text flips), animated icon swap (rotate + fade, 250 ms), keyboard accessible.
5. **Migrate all components** from hard-coded colours to semantic tokens. Mandatory mapping:
   `bg-white → bg-surface`, `bg-canvas/60 → bg-surface-2`, `text-navy-900 → text-ink`, `text-navy-700/500 → text-ink-2/ink-3`, `border-line` stays (token now themed),
   `bg-navy-900 text-white` (primary button) → `bg-ink text-canvas` or a dedicated `--btn` pair so it is dark-on-light in light and light-on-dark in dark,
   amber/red/teal/blue tone classes in `Badge`, `Alert`, footer disclaimer → `*-soft` + matching text tokens.
6. **Charts and inline styles**: recharts props, SVG fills, inline `style={{ background: '#…' }}` must use `var(--…)` or a `useThemeColors()` hook. Risk colours keep coming from `lib/risk.ts` (they already work on both backgrounds; verify contrast on dark).
7. **Contrast**: body text ≥ 4.5:1, large text/icons ≥ 3:1 in both themes. Check the amber disclaimer footer in dark mode in particular.

### 4.2 Navigation and information architecture — requests 1 and 2

New sidebar order (`AppShell.tsx` `NAV`):

1. **Report** (route `/`) — latest assessment report. Icon `FileHeart` or `Activity`.
2. **New Assessment** (`/assessment`)
3. **Batch Import** (`/import`) — rename from "Excel Import"; keeps working, now accepts csv+xlsx.
4. **History** (`/history`)
5. **Model Evaluation** (`/evaluation`)
6. **Settings / About** (`/about`)
7. *(small "Explore" section label)* **Heart Explorer (demo)** (`/explorer`) — **last**.

Rules:
- `/` renders a new `LatestReportPage` (`features/predictions/LatestReportPage.tsx`): calls `api.listPredictions()`, picks the newest with `has_results`, and renders `<ResultsPage predictionId={…}/>` content inline (refactor `ResultsPage` to accept an optional `id` prop falling back to `useParams`). **Do not redirect**, the URL stays `/`. No predictions → `EmptyState` with two large buttons: **Enter patient data** (`/assessment`) and **Upload CSV / Excel** (`/assessment?tab=upload`). Include a small "or view the demo explorer" text link at the bottom.
- Keep `OverviewPage` and its route at `/overview` (not in nav) so nothing breaks; link to it from History's header as "Dashboard".
- `ExplorerPage`: add a one-line banner at the top: "Demo sliders — not a patient. See a real patient report →" linking to `/`. Theme-correct. No other behaviour change.
- Mobile: the sidebar drawer keeps working; the Explorer item stays last.

### 4.3 New Assessment with CSV/Excel upload — request 2

`AssessmentPage.tsx` becomes two tabs (`role="tablist"`, URL `?tab=manual|upload`, default `manual`):

- **Enter manually** — the existing form, unchanged behaviour.
- **Upload CSV / Excel** — new `features/patient-assessment/UploadTab.tsx`:
  1. Drop zone (drag & drop + click; `.csv,.xlsx`; max 5 MB shown). Link buttons: "Download CSV template" (`api.templateCsvUrl`), "Download Excel template".
  2. Calls `api.importFile(file)`. Show validation summary like `ImportPage` does (outcome columns ignored / unknown columns / missing columns alerts — reuse by extracting a shared `ImportSummary` component from `ImportPage`, do not copy-paste).
  3. **Exactly one valid row** → show a "Patient preview" card (age, sex, key vitals) and a primary button **Run assessment**. Clicking it calls `api.createPrediction(row.features)` exactly like the form and navigates to `/results/<id>`. The assessment must behave identically to the manual one (same loading state, same error handling, same `unavailable` handling).
  4. **Several rows** → compact picker table (Row, Age, Sex, status); each row has **Assess** (same flow as above) and **Edit in form** (writes the draft to `sessionStorage['cardiovista.assessment.draft']` like `ImportPage.openInForm` and switches to the manual tab). A footer link "Run all rows in Batch Import".
  5. Rows with validation errors are shown with the server's messages and cannot be assessed.
  6. All error states are human sentences (file too big, wrong type, not a patient sheet, server offline).
- `ImportPage`: change the input `accept` to `.csv,.xlsx`, call `api.importFile`, text updated ("Upload a .csv or .xlsx…"). Rest unchanged.

### 4.4 The report page — requests 3 and 4 (the centrepiece)

Refactor `ResultsPage.tsx` into a 3-column layout (full diagram in `docs/PLAN_UI_OVERHAUL.md` §6). Create the panels as separate files under `features/predictions/panels/`.

**Grid (≥ 1280 px):** `grid-cols-[300px_minmax(0,1fr)_340px]`, gap 20 px; outer max width widened to `max-w-[1760px]` for this page only (the shell currently caps `main` at 1400 px: make the cap overridable per page, e.g. a `wide` prop/outlet context, without changing other pages). 1024–1279 px: two columns (left+centre), right panel moves under the heart. < 1024: one column, order = Verdict → Heart → Drivers → Vessels → Mini-charts → Patient.

**Centre column**
- Header strip above the heart: vessel focus buttons (LAD/LCX/RCA/Reset, keep existing behaviour).
- `<HeartScene>` with `className="h-[clamp(560px,78vh,900px)]"`. The heart must dominate the page. No cards overlapping it.
- Immediately **below** the heart (outside the canvas): the **four mini-visualizations** in a responsive row: `grid-cols-2 xl:grid-cols-4`, each a `Card` of fixed height ~230 px with a title, a one-line "how to read" subtitle, and a tooltip on hover. Specified in 4.5.

**Left column — `PatientSnapshotPanel`** (sticky `top-20`, scrolls internally if tall)
- Header: age, sex, BMI (value + category word: under/normal/over/obese using standard cut-offs 18.5/25/30), blood pressure, heart rate (PR). Large numerals, small labels.
- **Risk factors** chips: DM, HTN, Current Smoker, EX-Smoker, FH, Obesity, DLP, CRF, CVA, CHF… — show only those present (`true`), red-soft chips with icon. If none: "No recorded risk factors" in muted text.
- **Symptoms**: Typical/Atypical/Nonanginal chest pain, Dyspnea, Function Class (NYHA I–IV text), Weak peripheral pulse, Edema, Lung rales, murmurs.
- **ECG & Echo**: Q wave, ST elevation/depression, T inversion, LVH, poor R progression, BBB; EF-TTE with a mini bar (normal ≥ 50 %), Region RWMA, VHD.
- Derive everything from `data.inputs` + `schema` (labels, options via `displayValue`). Do not hard-code labels that the schema already provides. Missing value → omit the item, never print "undefined/null".

**Right column**
- `VerdictCard`: animated radial gauge (SVG, stroke-dashoffset animation 900 ms ease-out) showing overall probability with a **tick at the threshold**, big number counting up, verdict sentence per section 6 wording, reliability badge. Colour from `riskColor`.
- `WhyCard` ("Why the model says this"): from `explanation.contributions` filtered to `target === 'CAD'`, take the **top 3 positive** drivers and **top 2 negative** drivers and render sentences via `lib/narrative.ts` (4.6). Each sentence has a small coloured icon (↑ red / ↓ blue) and the "+12 pts" chip. A "See all drivers" button scrolls to the full list below. If no explanation: friendly "Explanations are not available for this record."
- `VesselCards`: LAD/LCX/RCA cards (reuse/restyle `ResultCards.VesselCards`): probability, a bullet bar with a **threshold tick**, status chip (**Flagged** / **Not flagged**), severity word, reliability badge (low = amber with the existing LOW_NOTE tooltip). The card matching `tourStep.vessel` or `selected` gets a glowing ring (CSS animation, subtle).
- `NextStepsCard`: static conservative text from section 6.
- `CaveatsCard` (collapsed by default): model version, what the data can't tell (no lesion location), the sensitivity note currently in ResultsPage.

**Below everything (full width, collapsible `<details>` styled as cards):**
- `Full drivers explorer`: tabs CAD / LAD / LCX / RCA (default CAD; switching to a vessel selects that vessel on the heart) showing the diverging bar list from the existing `ExplainabilityPanel` restyled. The active tab follows `selected`.
- `Input measurements` (existing `InputSummary`, themed).

### 4.5 The four mini-visualizations (all under the heart, all recharts or pure SVG, all themed)

Create `features/predictions/charts/` with one file each. Each must handle `null/undefined` input by rendering a small "Not available for this record" state (not an empty chart, not a crash).

1. **`DriversChart` — "What pushed the estimate"** Diverging horizontal bars for the top 8 `|contribution|` of the **currently selected target** (CAD default; follows `selected` vessel). Left of zero = toward normal (blue), right = toward disease (red). Label = feature label + value ("Fasting glucose · 180 mg/dL"). Bars grow from zero on mount (staggered 40 ms). Tooltip: "If this were typical, the estimate would be 12 pts lower". Axis labelled "points of probability". Sorted by impact.
2. **`VesselThresholdChart` — "Each artery vs its threshold"** Three bullet gauges (Overall CAD plus LAD, LCX, RCA = four rows): track 0–100 %, filled bar to probability coloured by `riskColor`, a vertical tick at that target's threshold with a label "thr 40 %", a status dot. Rows ordered as `findings.rank` (overall first). Bars animate in.
3. **`LabsVsRangeChart` — "Key values vs reference range"** Strip plots (one row per marker) for the markers that exist in `inputs`: FBS, LDL, HDL, TG, BP, HB, CR, EF-TTE (pick up to 7). Each row: a horizontal axis scaled to `[min(ref_low, value, observed_min)…max(ref_high, value, observed_max)]` with padding, a shaded **reference band** from `ref_low` to `ref_high` (either may be missing → one-sided band), the patient's value as a dot with label. Dot is red-ish and the value label bold when outside the band, neutral when inside. **In-range is never green-checked.** If no row has a reference range, show values only. Source of bounds: `schema.features[].ref_low/ref_high` (fallback: `observed_min/max` with no band).
4. **`ClinicalBurdenRadar` — "Clinical profile"** Radar (recharts `RadarChart`) with 5 axes scored 0–100 computed in `lib/clinical.ts` from the inputs: **Risk factors** (count of present risk factors / 8), **Symptoms** (symptom_score-like: typical CP ×2 + atypical + function class + dyspnea, normalised), **ECG** (count of abnormal ECG flags / 8), **Labs** (share of the lab markers in chart 3 that are outside range), **Cardiac function** (100 − clamp(EF-TTE−30, 0..40)/40×100, i.e. low EF → higher). Show the formula in the card's info tooltip ("A descriptive summary, not a model output"). Filled area uses accent colour at 25 % opacity; area animates from the centre.

Cross-linking: hovering a vessel row in chart 2 calls `onSelect(vessel)`-preview (hover state only, no camera move; click selects). Selecting a vessel anywhere updates chart 1.

### 4.6 Plain-language narrative — `lib/narrative.ts`

Pure, unit-testable functions (add a tiny vitest-less test as a TS file runnable with `tsx` if you cannot add vitest; otherwise skip tests but keep functions pure):

- `driverSentence(c: FeatureContribution, spec: FeatureSpec | undefined): string`
  - Positive: `"{Label} ({value}{unit}) is {above|below|outside} the usual range and raised the estimate by about {n} points."` — use "above/below" only when `ref_low/ref_high` exist and the value is outside; otherwise `"{Label} ({value}) raised the estimate by about {n} points."`
  - Negative: `"{Label} ({value}) lowered the estimate by about {n} points."`
  - `n = Math.round(Math.abs(contribution) * 100)`; if `n === 0` use "less than 1 point".
  - Binary features: value "Yes/No" → `"Having {label lowercased} raised…"` / `"No {label lowercased} lowered…"`.
- `verdictSentence(out: TargetOutput)`, `vesselSentence(f: VesselFinding)`, `bmiCategory(bmi)`, `functionClassText(n)`.
- Never produce text containing: "has CAD", "diagnosed", "causes", "because of". Use "model flags", "raised the estimate".

### 4.7 Motion — "visually rich and meaningful, with motion"

Rules: motion must carry meaning (hierarchy, change, relationship), be ≤ 600 ms unless it is a data reveal, and be fully disabled under `prefers-reduced-motion`.

- Install `motion` only. Create `components/motion.tsx` with helpers: `Reveal` (fade+rise on scroll into view, stagger via `delay`), `CountUp` (number tween 0→value, 900 ms, `tabular-nums`, formats via `pct`), `Stagger`.
- Report page entrance: left panel slides in from left (16 px), right from right, charts fade-rise staggered 80 ms, verdict gauge draws.
- Verdict gauge: arc draw + number count-up + a soft pulse on the ring when status is flagged (2 slow pulses, then stop; not infinite).
- Vessel cards: hover lift 2 px; the active (tour/selected) card has a ring glow.
- Route transitions: 180 ms cross-fade of `<Outlet/>` (key by pathname).
- Theme toggle: icon morph; background colour transition 250 ms on `body` and `Card` (`transition-colors`), but **do not** transition during the first paint.
- Sidebar active item: animated indicator that slides between items (layout animation).
- Buttons: press scale 0.98. Skeleton shimmer for loading (replace bare `Spinner` on the report with a 3-column skeleton that matches the layout).
- Forbidden: infinite looping animations (other than the 3D, which is not yours), auto-playing parallax, animation on every scroll tick, motion on text paragraphs.

### 4.8 Other pages — keep them consistent

`OverviewPage`, `HistoryPage`, `EvaluationPage`, `AboutPage`, `ExplorerPage`, `ImportPage`: migrate to semantic tokens, make sure tables/charts look right in dark. History rows' "View 3D" link renamed "Open report". Evaluation charts (recharts) themed. No layout redesign beyond what is listed.

**Hard-coded colour grep checklist (must return nothing relevant when you finish):**
```
grep -rnE "bg-white|text-white|#[0-9a-fA-F]{3,8}\b|rgb\(|bg-(amber|red|teal|blue|emerald)-[0-9]|text-(amber|red|teal|blue)-[0-9]|border-(amber|red|teal|blue)-[0-9]" frontend/src --include=*.tsx --include=*.ts --include=*.css
```
Allowed exceptions: `lib/risk.ts` stops, files under `features/heart-3d/` (not yours), and one-off white icon on a coloured chip when verified in both themes. Document exceptions in your summary.

---

## 5. Fixtures (so you are never blocked)

Create `frontend/src/dev/fixtures.ts` exporting `FIXTURE_HIGH`, `FIXTURE_LOW`, `FIXTURE_OLD` (an old record without `findings`/`explanation`) typed as `PredictionResponse`. Add `VITE_USE_FIXTURES=true` support in `services/api.ts` so `getPrediction('fixture-high' | 'fixture-low' | 'fixture-old')` and `listPredictions()` return them without a server; `createPrediction` returns `fixture-high`. Default off. Example (use realistic values, build the other two the same way):

```ts
export const FIXTURE_HIGH: PredictionResponse = {
  id: 'fixture-high', status: 'ready', created_at: '2026-10-15T09:30:00Z', provider: 'trained',
  model_version: '2026-10-15-ens5', message: null, probability_semantics: 'Estimated likelihood from clinical data.',
  disclaimer: 'Research prototype.',
  overall: { target: 'CAD', label: 'Overall CAD', probability: 0.87, predicted_class: 'positive', class_text: 'CAD', threshold: 0.42, reliability: 'good' },
  vessels: {
    LAD: { target: 'LAD', label: 'LAD', probability: 0.652, predicted_class: 'positive', class_text: 'Stenosis', threshold: 0.4, reliability: 'good' },
    LCX: { target: 'LCX', label: 'LCX', probability: 0.328, predicted_class: 'negative', class_text: 'Normal', threshold: 0.45, reliability: 'low' },
    RCA: { target: 'RCA', label: 'RCA', probability: 0.538, predicted_class: 'positive', class_text: 'Stenosis', threshold: 0.48, reliability: 'low' },
  },
  findings: [
    { vessel: 'LAD', status: 'stenotic', probability: 0.652, threshold: 0.4, severity: 'moderate', reliability: 'good', rank: 1 },
    { vessel: 'RCA', status: 'stenotic', probability: 0.538, threshold: 0.48, severity: 'moderate', reliability: 'low', rank: 2 },
    { vessel: 'LCX', status: 'normal', probability: 0.328, threshold: 0.45, severity: null, reliability: 'low', rank: 3 },
  ],
  explanation: { method: 'Occlusion (value replaced by training-typical, ensemble)', note: 'Impact of each value on the model output.',
    baselines: { CAD: 0.31, LAD: 0.22, LCX: 0.2, RCA: 0.25 },
    contributions: [
      { target: 'CAD', feature: 'Typical Chest Pain', label: 'Typical chest pain', value: true, contribution: 0.21 },
      { target: 'CAD', feature: 'Age', label: 'Age', value: 67, unit: 'years', contribution: 0.12 },
      { target: 'CAD', feature: 'FBS', label: 'Fasting blood sugar', value: 180, unit: 'mg/dL', contribution: 0.09 },
      { target: 'CAD', feature: 'EF-TTE', label: 'Ejection fraction', value: 40, unit: '%', contribution: 0.07 },
      { target: 'CAD', feature: 'HTN', label: 'Hypertension', value: true, contribution: 0.05 },
      { target: 'CAD', feature: 'HDL', label: 'HDL cholesterol', value: 52, unit: 'mg/dL', contribution: -0.03 },
      { target: 'CAD', feature: 'Current Smoker', label: 'Current smoker', value: false, contribution: -0.04 },
      // …add LAD / LCX / RCA entries too (at least 5 each)
    ] },
  inputs: { Age: 67, Sex: 'Male', BP: 150, PR: 82, FBS: 180, LDL: 142, HDL: 52, TG: 190, 'EF-TTE': 40, HTN: true, DM: true, 'Typical Chest Pain': true /* … fill ~40 realistic inputs matching GET /features */ },
}
```
`FIXTURE_LOW`: overall 0.12 negative, all vessels normal (findings status `normal`), few small contributions. `FIXTURE_OLD`: same as high but `findings` and `explanation` and `ref_*` absent.

---

## 6. Wording rules (medical safety) — binding

- Verdict flagged: **"The model flags probable coronary artery disease."** Not flagged: **"The model does not flag coronary artery disease."**
- Always follow with: "This is a screening estimate from clinical data only. Confirm with a clinician and appropriate diagnostic testing."
- Not flagged adds: "A negative result does not rule out disease."
- Vessel flagged: "Flagged" (+ "low confidence" when reliability low). Never say "blocked", "occluded", "X % narrowed". The probabilities are model scores, not stenosis percentages. Use "score" or "probability", not "stenosis %".
- Drivers: only the phrasing in 4.6. Add the footnote under the chart: "Impact of each value on the model's output. These are model behaviours, not causes, and they do not add up to the total."
- Next steps (static): "Discuss these results with a cardiologist." / "Consider confirmatory testing as clinically indicated." / "Review modifiable risk factors listed on the left." No drugs, doses or treatment instructions.
- Keep the existing disclaimer footer on every page in both themes.

---

## 7. Accessibility, responsiveness, performance

- WCAG AA contrast in both themes. All interactive elements keyboard reachable with a visible focus ring (`:focus-visible`, themed).
- Charts: each has `role="img"` and an `aria-label` that states the key facts in words (e.g. "Top drivers: typical chest pain +21 points, age +12 points…"), plus a visually-hidden data table or list.
- Tabs follow the ARIA tab pattern. Tooltips are also reachable by focus.
- Layout verified at 1920×1080, 1440×900, 1280×720, 1024×768, 768×1024, 390×844. No horizontal scroll, nothing overlapping the heart canvas.
- Do not import recharts/motion into the initial bundle for pages that don't need them: lazy-load `ResultsPage`, `ExplorerPage`, `EvaluationPage` with `React.lazy`. Initial JS ≤ current + 25 KB gz.
- No layout shift: charts reserve their height while loading.

---

## 8. Order of work (do not reorder; commit after each)

0. **Contract & fixtures**: types (3.1), `fixtures.ts`, `VITE_USE_FIXTURES`, `api.importFile/templateCsvUrl`.
1. **Theme foundation**: tokens, `ThemeProvider`, no-flash script, toggle, migrate `ui.tsx` and `AppShell`.
2. **Navigation/IA**: new NAV order, `LatestReportPage`, route `/`, `/overview`, Explorer banner + last position.
3. **Report skeleton**: new 3-column `ResultsPage` with panels stubbed from fixtures, heart in centre, responsive collapse, skeleton loader.
4. **Left panel** (`PatientSnapshotPanel`) + `lib/clinical.ts`.
5. **Right panel** (`VerdictCard`, `WhyCard`, `VesselCards`, `NextStepsCard`, `CaveatsCard`) + `lib/narrative.ts`.
6. **Four charts** (4.5) and the full drivers explorer.
7. **Assessment tabs + UploadTab** + `ImportPage` update + shared `ImportSummary`.
8. **Migrate remaining pages** to tokens (Overview, History, Evaluation, About, Explorer, Import) + grep checklist (4.8).
9. **Motion pass** (4.7) + reduced-motion verification.
10. **QA**: acceptance checklist below, screenshots, bundle check, summary.

---

## 9. Acceptance checklist (tick every box with evidence)

Navigation and flow
- [ ] `/` shows the latest report (or empty state with the two CTAs); URL stays `/`.
- [ ] Sidebar order exactly as 4.2, Explorer last under "Explore"; mobile drawer works.
- [ ] Explorer shows the demo banner and still works with sliders.
- [ ] New Assessment has two tabs; manual form behaves exactly as before (draft persistence, validation, submit → `/results/:id`).
- [ ] Upload tab: 1-row file → preview → Run assessment → report; multi-row file → picker with Assess / Edit in form; invalid file → clear message.
- [ ] `ImportPage` accepts `.csv` and `.xlsx`.

Report
- [ ] 3-column layout at ≥ 1280 px; collapses correctly at 1024 and 390.
- [ ] Heart canvas height `clamp(560px,78vh,900px)`; nothing overlaps it.
- [ ] Four mini-charts sit directly under the heart, outside the canvas, equal heights.
- [ ] Left panel shows only values that exist; no "undefined/null".
- [ ] Right panel verdict gauge has the threshold tick; vessel cards show threshold tick, Flagged/Not flagged, reliability.
- [ ] "Why the model says this" renders sentences exactly per 4.6; footnote about non-additivity present.
- [ ] Charts degrade gracefully with `FIXTURE_OLD` (no crash, "not available" states) and with `FIXTURE_LOW`.
- [ ] Tour highlighting: when `onTourStep` fires, the matching vessel card glows (test by calling the callback manually if 3D is not ready).

Theme
- [ ] Toggle works, persists, respects system on first visit, no flash on reload.
- [ ] Grep checklist (4.8) clean except documented exceptions.
- [ ] Every page screenshot in both themes has no unreadable text, white boxes or black-on-dark.

Quality
- [ ] `npm run typecheck` and `npm run build` pass; no new `any`; no console errors/warnings on any route.
- [ ] Reduced-motion verified (DevTools emulation) — no count-up, no autoplay, no slide-ins.
- [ ] Keyboard-only walkthrough of report and upload tab works; focus visible in dark.
- [ ] Screenshots saved in `docs/screenshots/`: `report-light-1440.png`, `report-dark-1440.png`, `report-light-390.png`, `report-dark-390.png`, `assessment-upload-light.png`, `assessment-upload-dark.png`.
- [ ] Files changed listed; any deviations or assumptions written in section 9 of `docs/PLAN_UI_OVERHAUL.md` under "Requests to the other side".

---

## 10. Things that commonly go wrong (read twice)

1. Treating `contribution` as a percent or as additive. It is probability points and non-additive.
2. Using a fixed 0.5 as "positive". Each target has its own threshold; use `threshold` and `findings[].status`.
3. Hiding `reliability: 'low'`. LCX/RCA are weak; the doctor must see that.
4. Forgetting old records. `findings`, `explanation`, `ref_*` can all be missing.
5. Leaving `bg-white`/hex colours so dark mode shows white cards.
6. Making the sidebar "Report" link point to `/results/:id` and not `/`.
7. Moving the heart into a small card again. It must stay the dominant element.
8. Adding infinite animations or heavy 3D-like effects to charts (the GPU is busy with the heart).
9. Editing `HeartScene.tsx` or backend files "just to make it work". Use the request log instead.
10. Changing `sessionStorage['cardiovista.assessment.draft']` format. The form depends on it.
