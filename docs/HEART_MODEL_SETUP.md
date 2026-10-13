# 3D heart model: inspection, mapping and preparation

## Current setup: one heart (the textured scan) + approximate vessel overlay

- **Heart:** `frontend/public/models/heart-scan.glb`, generated from `3d-digital-model-of-coronary-arteries/` (188 MB OBJ + texture):
  vertex colours sampled from `FinalHeartScan3dec.jpg`, quadric-decimated to 200k triangles (4.5 MB), a single mesh named `Heart_Scan`.
  The original OBJ/texture are untouched. The GLB is git-ignored until the Sketchfab licence is verified.
- **Vessels:** the scan is one object (1.25M vertices, one material, a fragmented texture atlas): its arteries are **not**
  separate meshes. The LAD, LCX and RCA are therefore tubes drawn at runtime along centre-lines in
  [`vesselPaths.ts`](../frontend/src/features/heart-3d/vesselPaths.ts). They are an **approximate overlay**, seeded from standard
  anatomy, not segmented from the scan, and the UI says so ("Vessel overlay - approximate placement").
- **Refining them:** *3D Heart Explorer -> Place vessels*: choose a vessel, click along the artery on the heart (start at the aortic
  root), undo/clear as needed. Points are saved in the browser; *Copy paths JSON* and paste into `DEFAULT_PATHS` to make them permanent.
  Someone qualified should check the placement before any demo that claims anatomical correctness.
- **Colour + score:** each tube is coloured by the model output with the shared scale, and a floating tag shows `LAD 73%`. Tags fade
  when the vessel is on the far side of the heart. Geometry is never scaled to represent stenosis.
- **Caveats:** the scan looks like a dissected specimen; the back/atrial side is dark (poorly captured); left/right laterality was
  inferred (apex side = left ventricle), so verify before using it for teaching. Raycasting 200k triangles is only enabled
  in placement mode.
- `frontend/public/models/coronary-heart.glb` (the original 32 KB schematic with separate `LAD`/`LCX`/`RCA` meshes) is **kept
  unchanged but no longer used**. To use it again set `VITE_3D_MODEL_PATH=/models/coronary-heart.glb`: the app maps vessels by
  mesh name when present (and renders `Heart_Body` translucent via `CONTEXT_OPACITY`). Its provenance is unconfirmed (see ASSET_ATTRIBUTION.md).
- Regenerating the scan GLB: see `assets/3d/scripts/README.md`.

## BodyParts3D LAD trunk (three OBJ segments)

Source: `BP51969_FMA3_2_1_inference_partof_FMA74912_Trunk_of_anterior_interventricular_branch_of_left_coronary_artery/` (originals kept
in place). Copies: `frontend/public/models/coronary/LAD/MM420.obj`, `MM424.obj`, `MM425.obj` + `manifest.json`.

Inspection results (programmatic; Blender is not installed and was not used):

| File | `v` lines in file (the in-app inspector shows distinct positions: 323 / 554 / 458) | Triangles | z range (mm) | Role |
| :--- | ---: | ---: | :--- | :--- |
| MM420 | 397 | 642 | 1245.5 – 1252.1 | proximal segment |
| MM424 | 610 | 1104 | 1232.8 – 1248.1 | middle segment |
| MM425 | 511 | 912 | 1187.0 – 1234.1 | distal segment |

- Valid geometry with normals; open (not watertight) tubes; no `.mtl`/textures; units mm in BodyParts3D whole-body coordinates (z up).
- **Complementary, not duplicate:** MM420↔MM424 and MM424↔MM425 touch end to end (nearest vertices 0.04 mm apart, no shared vertices);
  MM420↔MM425 are 20 mm apart. Together ≈ 65 mm of trunk. Proximal→distal order is inferred from continuity (decreasing z).
- **Alignment with `heart-scan.glb` cannot be verified.** The scan is a separate photogrammetry specimen; there is no BodyParts3D heart or shared
  landmark to register against. So the default stays the seeded LAD overlay. In *3D Heart Explorer → LAD model (BodyParts3D)* you can choose
  *BodyParts3D isolated* (the trunk alone, for inspection) or *BodyParts3D on scan* (manual position/rotation/scale sliders, saved in the browser,
  labelled "unverified"). In overlay mode the BodyParts3D LAD replaces the seeded LAD tube (no duplicate) and takes the risk colour, selection and floating score tag.
- Segment colour is configurable (`BP3D_LAD.defaultColor` / colour picker). Scale is `BP3D_LAD.unitsPerMm` (matches the scan's ~181 mm → 2.4 units).
- LCX and RCA now have their own BodyParts3D mesh sets (see below); vessels left on *Seeded overlay* keep the approximate tube.
  Settings (mode, visibility, colour, manual placement) are independent per vessel in *3D Heart Explorer → Vessel models*. Isolated inspection shows one vessel at a time.
  Config lives in `bp3dVessels.ts` (`BP3D_VESSELS`); loading/disposal in `useBp3dLad.ts` (`useBp3dVessel`). A missing or empty OBJ sets that vessel to an error state and its seeded overlay stays.
- Attribution: BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan (ShareAlike applies to derived material).

## Using a different heart model

1. Drop the GLB in `frontend/public/models/` and set `VITE_3D_MODEL_PATH` (or replace the file).
2. Open **3D Heart Explorer → Model inspector**: it lists every mesh (vertices, triangles, material, bounds) and shows which
   of LAD/LCX/RCA resolved.
3. Edit `meshNames` per vessel in `vesselConfig.ts` to the names shown. Adjust `CONTEXT_OPACITY` for shells that hide vessels.

## Preparing separate vessel meshes in Blender (for a scan like the OBJ above)

1. Import the OBJ. Decimate (Modifier → Decimate, ratio ≈ 0.02–0.05) or retopologise to ≲ 100–200k triangles; bake the texture to a ≤ 2k map.
2. Edit Mode → select the faces of each artery (Select Linked / Select Similar, or box-select along the vessel) →
   `P` → *Selection* to split it into its own object. Do this for LAD, LCX and RCA; keep aorta/body as separate objects.
3. Rename objects exactly (`LAD`, `LCX`, `RCA`, …) — or any name, then update `meshNames`.
4. Give each vessel its **own material** (the app clones materials, but each vessel needs a distinct mesh).
5. Apply transforms (`Ctrl+A`), set Y-up, export glTF Binary (`.glb`), enable Draco if size matters (add a Draco decoder in drei then).
6. Verify in the Model inspector. Anatomical identification of which branch is the LAD/LCX/RCA must be done by someone qualified.

## What the colouring means

Colour/emissive strength follows the model output for that vessel with one shared scale (`lib/risk.ts`, `VISUAL` in
`vesselConfig.ts`). Vessel geometry is never scaled or narrowed: the dataset has no patient-specific lesion location or geometry.

## BodyParts3D LCX and RCA (added 2026-10-12)

Source: BodyParts3D 4.0, PART-OF tree, 99% polygon reduction, `partof_BP3D_4.0_obj_99.zip`
(https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_BP3D_4.0_obj_99.zip), with component lists from `partof_element_parts.txt`.
Files are byte-identical to the archive members (no modification). Retrieved 2026-10-12.

- **LCX** — `frontend/public/models/coronary/LCX/`: FJ2649–FJ2654, concept FMA3895 "Circumflex branch of left coronary artery" (representation BP9745). The database has no separate trunk concept; which component is proximal is not stated, and some components are separated by up to ~9 mm gaps.
- **RCA** — `frontend/public/models/coronary/RCA/`: 29 components of FMA50039 "Right coronary artery" (BP9299): trunk FJ2723 (FMA3802, BP9674), marginal (FMA3818), anterior ventricular (FMA3815), posterior ventricular (FMA3837), posterior interventricular (FMA3840) branches and right conus artery (FMA3807, FJ2670/FJ2676). Per-file ids are in `RCA/manifest.json`.
- Each OBJ has `usemtl mtl1` but no `.mtl`/textures; units mm, whole-body coordinates (z up); open meshes with normals.
- The LAD files come from an older BodyParts3D export (BP51969, FMA 3.2.1) than LCX/RCA (4.0). All three sit in the same coordinate region, but their mutual registration is unverified, and none is registered to the scan.
- Not obtained: the website's per-download "BP5xxxx" representation ids for LCX/RCA (the site is JS-driven); the ids recorded are those in the archive file headers and `partof_parts_list_e.txt`.

## Maintenance notes (browser regression pass)

- **Clean clone:** `frontend/src/lib/risk.ts` is required source. `.gitignore` previously ignored it through the Python `lib/` rule; an exception (`!frontend/src/lib/`) now keeps it visible. `frontend/public/models/heart-scan.glb` is intentionally git-ignored (licence unverified), so a clean clone needs that file supplied separately.
- **React warning "Attempted to synchronously unmount a root…":** caused by drei `<Html>` (floating labels and the loader). Its default portal target is `events.connected || gl.domElement.parentNode`, which changes after the first pointer event, so drei tears down and rebuilds its DOM root during a React render. Both `<Html>` uses now pass a stable `portal`. Verified: with labels disabled there were 0 warnings; with the stable portal there are 0 on load and on route changes (it was 3 and 9).
- **Camera reset:** `OrbitControls` no longer re-saves its state after every drag, so "Reset camera" returns to the initial view instead of the last dragged one.
- Regression suite used for these checks: headless Chrome (software WebGL) driven by puppeteer-core, kept outside the repo. Pixel comparisons use a tolerance; orbit inertia settles slowly under software rendering.

