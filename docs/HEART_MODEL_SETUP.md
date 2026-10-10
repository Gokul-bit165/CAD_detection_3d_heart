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
- LCX and RCA are unchanged (seeded overlay). Do not derive them from these files. Next: obtain the matching BodyParts3D concepts
  (right coronary artery, circumflex branch of left coronary artery), copy them to `public/models/coronary/{RCA,LCX}/`, generalise `bp3dLad.ts`/`useBp3dLad.ts`
  per vessel, and ideally register all of them to the scan with real landmarks (or switch to a BodyParts3D heart as the body).
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
