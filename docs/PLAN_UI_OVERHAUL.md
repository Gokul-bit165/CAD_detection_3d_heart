# CardioVista UI Overhaul — Master Plan (Claude's part + shared contract)

Status: plan only, nothing implemented yet. Date: 2026-10-15.
Companion doc: [ANTIGRAVITY_UI_OVERHAUL.md](ANTIGRAVITY_UI_OVERHAUL.md) (the other half of the work).

---

## 0. Read this first — what the reviewer sees and what we change

The validator opens the app and judges in about 30 seconds. Today they land on the Overview page, then
probably click "3D Heart Explorer", which uses **manual sliders and no real patient**. That is the weakest screen
for judging "is the model summary-only or real?". The strongest screen is the **Assessment Report**
(real prediction, real vessel scores, 3D heart). So:

> The first thing seen must be a real patient **report**: verdict, the reasons behind it, a large 3D heart and
> four compact graphs, all readable by a doctor and a patient. The slider-based explorer moves to the bottom.

### The 4 requests, restated as testable outcomes

| # | Request (user's words, cleaned up) | Outcome we will verify |
|---|---|---|
| 1 | Move the 3D Heart Explorer down; validators see it first and may judge it a dummy | Explorer is the **last** sidebar item, under an "Explore" divider, labelled "Heart Explorer (demo sliders)". It is never the landing page. |
| 2 | Report first; new assessment can also upload a CSV, and the assessment then runs exactly like now | `/` shows the latest report. New Assessment has two tabs: **Enter manually** and **Upload CSV / Excel**. Uploading a one-patient file runs the same prediction call and opens the same report. |
| 3 | Dark + light theme; doctor-grade information: *why* CAD is high, which features contribute; four small visualizations beside the heart (not inside the 3D view); much bigger 3D view; information on left and right | Theme toggle persists. Report is a 3-column layout (left patient info / centre big heart / right verdict + reasons). Four mini-charts sit directly below the heart in the centre column. Heart fills the viewport. |
| 4 | Automatic 3D flow: show every stenotic vessel automatically, one by one, with normal ones as a small reference | Tour autoplays once on load: overview → each flagged vessel in turn (camera flies, vessel pulses, caption) with a small "healthy reference" mini-heart picture-in-picture. Normal vessels appear as small chips. Pause / skip / replay controls. |

### Assumptions I made (tell me if any is wrong, they are cheap to change now)
1. "Report first" = the landing route `/` shows the **latest saved assessment's report**; if none exists, an empty state with two big buttons (Enter patient / Upload CSV).
2. "CSV" also includes the existing `.xlsx` (the repo already has an Excel importer). We keep both.
3. Dark/light applies to the whole app including the 3D canvas background and charts.
4. "Stenotic" = the vessel's model output is at/above **that vessel's own tuned threshold** (`TargetOutput.threshold`, `predicted_class === 'positive'`), not a fixed 50%.
5. We never claim a lesion *location*. The dataset has no lesion geometry (existing disclaimer stays). The plaque marker on the 3D vessel is a visual cue of score, as today.

---

## 1. Facts from the current code (so nobody re-derives them)

- Frontend: React 19, Vite, Tailwind v4 (`@theme` tokens in `frontend/src/index.css`), react-router 7, recharts 3, three + @react-three/fiber + drei.
- Routes (`App.tsx`): `/` Overview, `/assessment`, `/results/:id`, `/import`, `/explorer`, `/history`, `/evaluation`, `/about`.
- Sidebar order today (`AppShell.tsx`): Overview, New Assessment, Excel Import, **3D Heart Explorer (4th)**, History, Evaluation, About.
- Report screen: `features/predictions/ResultsPage.tsx`, 3D canvas fixed at `h-[420px] lg:h-[530px]`, heart camera distance 5.6 (`HeartScene.makeGoals`) so the heart looks small (screenshot confirms: it fills ~35% of the frame).
- 3D: `features/heart-3d/HeartScene.tsx` (camera rig, tour, toolbar), `ScanHeart.tsx` (GLB `public/models/heart-realistic.glb`, nodes `LAD`/`LCX`/`RCA`, empties `focus_*`, plaque bulge shader, blood-pulse shader), `ProceduralHeart.tsx` (fallback). Existing "tour" is a generic overview→LAD→LCX→RCA→inside loop, not driven by findings.
- Backend: FastAPI. `POST /predictions`, `GET /predictions/{id}`, `GET /features`, `POST /import/excel` (xlsx only), `GET /import/template`.
- Model: `backend/app/predictors/trained.py` — ensemble (LR, KNN, RF, XGBoost, LightGBM) for 4 targets (CAD, LAD, LCX, RCA), per-target tuned Youden threshold, per-target `reliability` tier (LCX and RCA are weak).
- **Critical gap:** `trained.py::predict()` builds `PredictionResponse(...)` with **no `explanation`**. The UI "Feature contributions" panel therefore shows "No explanation available" for the real model. Request 3 ("why is CAD high, which features contribute") **cannot be met by frontend work alone**. This is the hard part and it is mine.
- Frontend `types/api.ts` already has `Explanation`/`FeatureContribution` (with a per-contribution `target`), so the wire format needs only additions.

---

## 2. Work split

| Owner | Scope | Why |
|---|---|---|
| **Claude (me)** | Backend: per-target explanations, vessel `findings`, parsed reference ranges, CSV import. 3D: findings-driven auto tour, healthy-reference picture-in-picture, vessel dimming/spotlight, large auto-fit framing, theme-aware lighting, toolbar redesign. Backend tests. Final integration + QA. | Correctness-critical (model inference, medical wording) and intricate (three.js camera/shader/state machine). |
| **Antigravity** | Theme system (light/dark, every component, charts), app shell + navigation reorder, report page layout (3 columns), left/right information panels, the four mini visualizations, plain-language narrative, assessment page CSV tab, motion/micro-interactions, empty/loading/error states, responsive + a11y pass. | Large, wide, mostly well-specified UI work. |

### File ownership (hard rule — prevents merge fights)

**Claude only:** everything under `backend/`, `frontend/src/features/heart-3d/HeartScene.tsx`, `ScanHeart.tsx`, `ProceduralHeart.tsx`, new `heart-3d/findingsTour.ts`, new `heart-3d/ReferenceHeart.tsx`, `docs/API_CONTRACT.md`.

**Antigravity only:** everything else under `frontend/src/` (`index.css`, `index.html`, `components/ui.tsx`, `app/*`, all other `features/*`, `lib/*`, `services/api.ts`, `types/api.ts`, `main.tsx`).

If either side needs a change in the other's file, write it under "Requests to the other side" in section 9 instead of editing.

---

## 3. The shared contract (the single most important section)

Both of us code against this. Antigravity can start immediately using fixtures (see its doc); I make the backend real.

### 3.1 New / changed API shapes

```ts
// types/api.ts additions (Antigravity pastes these verbatim in its step 0)

export type FindingStatus = 'stenotic' | 'normal'
export type Severity = 'mild' | 'moderate' | 'severe'

export interface VesselFinding {
  vessel: VesselId
  status: FindingStatus
  probability: number            // 0..1
  threshold: number              // this vessel's tuned decision threshold
  severity: Severity | null      // null when status === 'normal'
  reliability: 'good' | 'moderate' | 'low' | null
  rank: number                   // 1 = most severe; stenotic first (by probability desc), then normal
}

// PredictionResponse gains:
//   findings: VesselFinding[] | null      // null only when status === 'unavailable'
//
// FeatureSpec gains:
//   ref_low?: number | null               // parsed numeric reference bounds (null if not numeric/unknown)
//   ref_high?: number | null
//
// Explanation changes (shape unchanged, content richer):
//   contributions now contains entries for ALL FOUR targets (CAD, LAD, LCX, RCA),
//   up to 10 per target, sorted by |contribution| desc, |contribution| >= 0.005.
//   method = "Occlusion (value replaced by training-typical, ensemble)".
//   `contribution` is in probability units (0.12 = +12 percentage points).
//   Add:  baselines?: Record<TargetId, number>   // probability of a fully "typical" patient
```

Semantics the UI must respect (and may state in tooltips):
- `contribution = P(actual patient) − P(patient with this one input replaced by the training-typical value)`.
- Contributions are **not additive**. They do not sum to `probability − baseline`. **Do not draw a waterfall that implies they do.** Use a diverging bar chart of "impact of this value".
- Positive = pushes toward disease, negative = toward normal. It describes the *model*, not causation.

Severity bands (server-computed so UI and tour agree): by probability — `<0.5 mild`, `0.5–0.75 moderate`, `>=0.75 severe`, only applied when `status === 'stenotic'`.

### 3.2 Import endpoints

- `POST /api/v1/import/file` — accepts `.csv` **or** `.xlsx`, same `ImportResponse` as today. Old `/import/excel` stays as an alias.
- `GET /api/v1/import/template.csv` — CSV template (headers + one example row). `GET /import/template` (xlsx) unchanged.
- CSV rules: UTF-8 (with or without BOM), delimiter auto-detected (`,` `;` tab), same header names as the xlsx, same validation as the form (`validate_features`), same 5 MB / 500-row limits, outcome columns (Cath, LAD, LCX, RCA…) ignored and reported, never used.

### 3.3 Frontend ⇄ 3D component contract (what Antigravity may rely on)

I will deliver `HeartScene` with these **additional optional props** (all existing props keep working, so nothing breaks while I work):

```ts
interface HeartSceneProps {
  // existing: risks, manual, selected, onSelect, compact, className, resetSignal
  findings?: VesselFinding[]          // enables the findings tour + reference PiP
  autoTour?: boolean                  // default true when findings are provided; plays once on mount
  onTourStep?: (s: { index: number; total: number; vessel: VesselId | null; status: FindingStatus | 'overview' | 'summary' } | null) => void
  fit?: 'auto' | 'default'            // 'auto' = size the heart to fill the canvas (default 'auto' when not compact)
}
```
- `className` still controls the size; parent must give it a real height (e.g. `h-[clamp(560px,78vh,900px)]`).
- The canvas background and lighting follow `document.documentElement.dataset.theme` (`'light' | 'dark'`) on their own via a MutationObserver. Antigravity only has to set that attribute on `<html>`.
- `onTourStep` lets Antigravity's side panels highlight the active vessel card in sync with the camera.

---

## 4. My implementation plan

### Phase A — Backend explanations (the hard, correctness-critical part)

File: `backend/app/predictors/trained.py` (+ new `backend/app/predictors/explain.py`).

Method: **occlusion at raw-input level**, ensemble-aware.
1. Take the validated `features` dict (about 50 raw inputs; BMI is derived and excluded from perturbation, it follows Weight/Height or is itself an input depending on schema — verify in `schemas/features.py`).
2. Build a batch: row 0 = actual patient; rows 1..N = actual patient with input *j* removed (so `build_model_row` fills it with the training median/mode from `meta["fill_values"]`). Because engineered columns (NLR, TG_HDL, CP_type, symptom_score, …) are recomputed **inside** `build_model_row`, perturbing raw inputs keeps engineered features consistent. This avoids the classic bug of explaining engineered columns the user never typed.
3. One `predict_proba` per (model, target) over the whole batch (about 20 calls on ~50 rows; target runtime < 1 s on a laptop; test enforces < 3 s).
4. Ensemble probability per row = weighted sum with `bundle["weights"][target]` (same as `predict`). `contribution_j = p_row0 − p_row_j`.
5. Group occlusion for features that are one concept: chest-pain triplet (`Typical Chest Pain`, `Atypical`, `Nonanginal`), lipid pair is *not* grouped (they are separately interpretable). Grouped result is reported under the most informative member's label, value shown as the combined text ("Typical chest pain").
6. Keep top 10 per target with `|c| ≥ 0.005`. Fill `value`, `unit`, `label` from the schema so the UI needs no lookup.
7. `baselines[target]` = ensemble probability of an all-typical patient (row with every input removed).
8. Never log clinical values (existing rule).
9. Decision recorded: **not SHAP**. KNN and the stacked ensemble make TreeExplainer inapplicable; occlusion is model-agnostic, fast and honest. The method string says so. If time remains, add SHAP for the XGBoost/LightGBM members as an optional cross-check, not required.

Findings (`findings`): computed in the same predictor from `vessels` outputs: status from `predicted_class`, severity bands from §3.1, ranking stenotic-first by probability desc then normal by probability desc.

Schema/route changes:
- `schemas/prediction.py`: add `VesselFinding`, `PredictionResponse.findings`, `Explanation.baselines`.
- `schemas/features.py`: parse `ref_range` strings into `ref_low/ref_high` (e.g. "70–110", "< 200", "> 40"; unknown → null). Unit-test every `ref_range` present in the feature dictionary.
- Storage (`database/store.py`): saved predictions must round-trip the new fields (explanations are large-ish; confirm JSON column / migration, old rows without `findings` load as `findings: null` and the UI must cope).

### Phase B — Backend CSV import
- Refactor `importing/excel.py`: split `parse_workbook` into "read raw rows" and "validate rows" so xlsx and csv share validation. New `importing/tabular.py` with `parse_csv(data: bytes)`: decode `utf-8-sig` (fallback `latin-1`), `csv.Sniffer` on the first 4 KB limited to `,;\t`, header normalisation identical to xlsx (`_norm_header`), reject if fewer than 3 known headers (same message style), same limits.
- Routes: `POST /import/file` dispatches by extension and content sniffing; `GET /import/template.csv`.
- Edge cases: Excel-for-Windows CSV with `;` and decimal commas (accept `,` decimals only when the delimiter is `;`), `Y/N`, `Male/Fmale`, blank cells, trailing empty lines, quoted headers.

### Phase C — 3D: findings-driven automatic flow (request 4)
File: `heart-3d/findingsTour.ts` (pure, unit-testable state machine) + changes in `HeartScene.tsx`.

Tour script, built from `findings`:
```
overview (1.6 s)  →  [for each stenotic vessel, in rank order: focus (4.2 s)]  →  summary overview (2.4 s)  →  idle
```
- If **no** stenotic vessel: overview → "No vessel flagged" caption → each vessel briefly (2 s) so the viewer still sees all three are low → idle. Never a blank tour.
- Each focus step: camera flies to the vessel (existing `CameraRig`), **other vessels dim** (new `dim` factor in `ScanHeart` lerped toward lower emissive/opacity), focused vessel pulses (existing selected pulse + stronger plaque), in-canvas caption: `LAD · Stenosis flagged · 65% (threshold 40%) · moderate · model confidence: good`.
- Autoplay once after the GLB reports ready (`onReady`); any user drag/click cancels it; "Replay" button restarts; Play/Pause, Next, Previous, step dots. `prefers-reduced-motion`: no autoplay, manual stepping only.
- `onTourStep` is called on every step so Antigravity's cards can highlight the same vessel.

### Phase D — 3D: healthy reference picture-in-picture
File: `heart-3d/ReferenceHeart.tsx`.
- A small second `Canvas` (bottom-right, about 22% of width, min 150 px) rendering the **same GLB** (drei's `useGLTF` cache shares the asset; `ScanHeart` clones geometry per instance, so no cross-talk) with all risks = 0 (healthy teal), same camera angle as the main view, labelled "Normal reference · LAD". It follows the tour step so the viewer compares *this patient's* vessel with a healthy one at the same angle.
- Patient's **normal** vessels appear as small chips under the PiP ("RCA 12% · normal"); clicking a chip focuses that vessel in the main view without breaking the tour state.
- Performance guard: PiP `frameloop="demand"` rendering at 30 fps cap, `dpr=1`, disposed when the tour is idle for 20 s and the PiP is hidden; one fewer WebGL context on mobile (<640 px the PiP becomes a static "reference" thumbnail rendered once via `gl.domElement.toDataURL`).

### Phase E — 3D: make the heart big, theme-aware, less cluttered
- **Auto-fit:** compute camera distance from the model's bounding sphere and canvas aspect: `d = radius / sin(fov/2) * 1.08`, recomputed on resize (`ResizeObserver`). Replaces the magic `5.6`. Target is nudged slightly down so the toolbar does not cover the heart. Goal: heart height ≈ 85–90 % of canvas height.
- **Toolbar:** vertical stack of 12 buttons on the right currently hides the heart. Replace with a slim bottom-centre pill (views · tour · ghost · plaque · reset · pause · beat · info), icons only with tooltips. Legend moves into a collapsible chip top-left. Nothing overlaps the heart's centre.
- **Theme:** background gradient, `ContactShadows` colour/opacity and light intensities switch between light (current) and dark (deep navy `#0b1220 → #111c30`, cooler rim light, emissive intensity bumped slightly so vessels glow on dark). The transition crossfades background over 300 ms.
- Remove the `MANUAL SCORES` badge logic only if explorer is unchanged — it stays for the explorer.

### Phase F — Tests, docs, integration
- Backend tests (`backend/tests/`): explanation present for all 4 targets, sorted, ≥ 1 and ≤ 10 entries, no forbidden/target columns, deterministic for the same input, runtime < 3 s; findings ranking/severity unit tests incl. boundary values; ref-range parser table test; CSV tests (BOM, `;` delimiter, tab, quoted, Y/N, 500-row limit, 501 rows rejected, outcome columns ignored, bad file → 422 with helpful message); round-trip of new fields through the store; old-row compatibility.
- Update `docs/API_CONTRACT.md` and `docs/MODEL_INTEGRATION.md`.
- Integration pass after Antigravity's PRs: run both servers, walk the QA checklist (§7), fix contract mismatches.

---

## 5. Clinical content rules (a "doctor mindset" checklist the UI must follow)

1. **Say what the model did, not what the patient has.** "Model flags probable CAD", never "Patient has CAD".
2. Always show the **threshold next to the probability** (a 45 % can be positive when the threshold is 40 %). Already true in `OverallCard`; keep it everywhere.
3. Show **reliability** wherever a vessel is shown. LCX and RCA are weak. A flagged RCA with `low` reliability is worded "possible, low-confidence".
4. Negative ≠ ruled out. Keep the existing sensitivity caveat (the "about 9 in 100 CAD patients missed" text is from held-out data; do not hard-code a new number without re-checking `eval_report.json`).
5. Reasons are **drivers of the model output**, in plain language: "Fasting glucose 180 mg/dL is above the usual range and raised the estimate by about 12 points." Causal claims are forbidden.
6. Values outside the reference range are visibly flagged (strip plot, red marker), values inside are neutral, **not green-checked** (in range does not mean healthy).
7. Keep the disclaimer footer on every page, in both themes.
8. Next-step text is generic and conservative ("discuss with a cardiologist; consider confirmatory testing"). No treatment advice, no drug names.

---

## 6. Report page target layout (≥ 1280 px)

```
┌ header: Assessment Report · Case ID · date · model · [Print] [New assessment] ───────────────────────┐
├──────────────┬───────────────────────────────────────────────────────────┬──────────────────────────┤
│ LEFT (300px) │ CENTRE (flex)                                             │ RIGHT (340px)            │
│ Patient      │ ┌───────────────────────────────────────────────────────┐ │ Verdict ring (animated)  │
│ snapshot     │ │                                                       │ │  prob + threshold marker │
│  age/sex/BMI │ │            BIG 3D HEART  (≈78vh, min 560px)           │ │ Why the model says this  │
│  BP/HR       │ │   tour caption (top)         PiP healthy ref (corner) │ │  top-3 drivers (words)   │
│ Risk factors │ │            bottom pill toolbar                        │ │ Vessel cards LAD/LCX/RCA │
│  chips       │ └───────────────────────────────────────────────────────┘ │  prob, threshold, rel.   │
│ Symptoms     │ ┌────────────┬────────────┬────────────┬────────────────┐ │ Suggested next steps     │
│  chips       │ │ 1 Drivers  │ 2 Vessel   │ 3 Labs vs  │ 4 Clinical     │ │ Model & data caveats     │
│ ECG / Echo   │ │ (diverging │ vs thresh. │ reference  │ burden radar   │ │                          │
│  findings    │ │  bars)     │ (bullets)  │ (strips)   │                │ │                          │
│              │ └────────────┴────────────┴────────────┴────────────────┘ │                          │
├──────────────┴───────────────────────────────────────────────────────────┴──────────────────────────┤
│ Full input measurements (collapsible) · Full feature contribution list (collapsible, per target tabs) │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
1024–1279 px: right panel drops under the heart. <1024 px: single column in the order verdict → heart → drivers → vessels → mini-charts → patient info. The four mini-charts are **outside** the canvas, directly under it.

---

## 7. QA checklist (I run this at integration, both themes)

- [ ] Fresh browser, empty DB: `/` shows empty state with 2 CTAs; no console errors.
- [ ] Submit a high-risk patient (use `docs/test_data/*.xlsx` rows): lands on report; verdict, drivers, and four charts populated; tour autoplays and visits **every** flagged vessel then stops.
- [ ] Submit a low-risk patient: tour shows "no vessel flagged" path; no empty/NaN charts.
- [ ] Upload a 1-row CSV from New Assessment: same report appears; upload a 5-row CSV: row picker appears; upload a broken CSV: clear error, nothing crashes.
- [ ] Old history items (saved before this change, no `findings`/explanations): report still renders, charts degrade to "not available for this older record".
- [ ] Toggle theme on the report while the tour is running: no flash, canvas recolours, charts readable, contrast AA.
- [ ] Reload: theme persists; `prefers-color-scheme` honoured on first visit.
- [ ] `prefers-reduced-motion`: no autoplay, no count-up, no parallax; everything still reachable.
- [ ] Explorer is the last nav item and still works with sliders.
- [ ] API offline / model unavailable: report and shell show friendly errors.
- [ ] 1440×900, 1920×1080, 1280×720, 1024×768, 390×844 screenshots. Heart ≥ 85 % of canvas height at desktop sizes; nothing overlaps the heart centre.
- [ ] `npm run typecheck`, `npm run build`, `pytest backend` all pass; Lighthouse accessibility ≥ 95 on `/results/:id`.
- [ ] Tab/keyboard: every control reachable; tour controls have labels; focus ring visible in dark mode.

---

## 8. Risks and decisions

| Risk | Mitigation |
|---|---|
| Occlusion is slow with KNN on big batches | Batch once per (model, target); cap rows at ~60; measured in test; fall back to top-N features by quick pre-screen only if > 3 s |
| Two WebGL contexts (main + PiP) on weak GPUs/mobile | PiP uses demand frameloop, dpr 1; static thumbnail under 640 px; main scene already has WebGL-unavailable fallback |
| Antigravity and I diverge on field names | §3 is the only source of truth; Antigravity builds against fixtures that match it; integration checks against the real API |
| Dark theme leaves hard-coded colours (`#fbfdff`, `bg-white`, hex in charts) | Antigravity's doc has a mandatory grep checklist; I re-grep at QA |
| Old saved predictions lack new fields | All new fields optional/nullable in types; explicit "older record" states |
| Reviewer still opens Explorer and sees sliders | Labelled "demo sliders", placed last, and its page links to "See a real patient report" |

---

## 9. Requests to the other side (append here, do not edit each other's files)

_(empty)_

---

## 10. Order of work

1. (me) Phase A + B backend, with contract fixtures committed under `docs/fixtures/` as soon as the shape is stable. Aim to publish fixtures first, in the first hour, so Antigravity is never blocked.
2. (Antigravity, parallel) Step 0 types + fixtures → theme → shell/nav → report layout → panels → charts → CSV tab → motion → QA.
3. (me, parallel) Phase C–E 3D work against `findings` fixtures.
4. (me) Phase F integration, QA checklist, fix list, final commit.
