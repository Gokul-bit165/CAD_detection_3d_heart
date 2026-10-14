# Prompt for Claude Desktop (Blender MCP): realistic heart for CardioVista

Paste everything below the line into Claude Desktop with the Blender MCP connected.

---

You are my 3D artist inside Blender (via the Blender MCP). Build ONE production-ready, realistic human heart with
anatomically convincing coronary arteries and export it as a web-ready GLB for a React Three Fiber app
(CAD / coronary artery disease risk visualisation). Work step by step, check the viewport after each step with screenshots,
and tell me honestly what worked and what did not. Do not claim anatomical accuracy you cannot verify.

## Inputs (all on this machine, project root `C:\Users\Admin\Documents\gokul\CAD-detection`)
1. **Heart scan (the look I want):** `3d-digital-model-of-coronary-arteries\source\FinalHeartScan3dec.zip`
   (unzip to a new empty folder; contains the OBJ). Texture: `3d-digital-model-of-coronary-arteries\textures\FinalHeartScan3dec.jpg`.
   It is a photogrammetry scan (about 2.5M triangles) of a specimen heart. I like its surface realism, but it is a
   single mesh with no separate vessels, a hollow/dissected aorta and a poorly captured back side.
2. **Coronary artery reference meshes (BodyParts3D, real atlas geometry):**
   `BP51969_FMA3_2_1_inference_partof_FMA74912_Trunk_of_anterior_interventricular_branch_of_left_coronary_artery\`
   (3 OBJ segments MM420, MM424, MM425 = the LAD trunk, millimetres, atlas coordinates). Use them as shape/length
   references for the LAD course; they are NOT registered to the scan, so you must align them by anatomical
   landmarks, or rebuild the course by eye on the scan surface.

## What I want
A single realistic heart where **LAD, LCX and RCA are separate, selectable objects** that look like real coronary
arteries, not pipes:
- Each artery is a **tapering, slightly tortuous, branching tree**: thick at the aortic ostium, thinning towards the
  periphery, with a main trunk plus side branches
  - LAD: diagonal branches (D1, D2) and septal perforators
  - LCX: obtuse marginal branches (OM1, OM2)
  - RCA: acute marginal branches, then the posterior descending artery (PDA)
  Build them as Blender curves with a taper/bevel (or Geometry Nodes curve-to-mesh with a radius that falls along
  the length), add small organic noise to radius and path, and use 12-16 radial segments. Branch junctions should
  blend smoothly (no visible intersections).
- Arteries must **sit on the heart surface** in the real grooves: LAD in the anterior interventricular groove down to
  the apex, LCX in the left atrioventricular groove wrapping to the back, RCA in the right AV groove to the crux.
  Use Shrinkwrap (project/nearest surface) with a small offset so they lie ON the epicardium, partly embedded, with
  a slightly raised look. Origins at the aortic root (left and right coronary sinuses).
- Realistic materials: epicardial fat tone along the grooves, glossy red-orange arteries with subsurface-like look
  (use Principled BSDF; keep it glTF-exportable, no unsupported shader nodes). Heart keeps the scan texture.
- **Fix the scan problems:** close/clean the aorta and great-vessel openings, fill holes, remove floating junk,
  fix the poorly captured back/atrial region as best you can (retopo or sculpt patch is fine), but keep the
  scan's surface detail. If something cannot be fixed convincingly, say so.
- Optional but wanted: aorta and pulmonary trunk stubs, and the four heart valves as simple low-poly leaflets
  inside (aortic, pulmonary, mitral, tricuspid) as separate objects, only if you can do it without wrecking the model.

## Technical contract (the website depends on this: follow it exactly)
- Decimate the scan to **about 150k-250k triangles** total heart (keep UVs, bake/keep one 2048x2048 texture). Arteries
  at most 60k triangles combined. Whole GLB **under 15 MB**; use Draco or Meshopt compression if available.
- **Object names (exact):** `Heart_Body`, `Aorta`, `LAD`, `LCX`, `RCA`. Each of LAD/LCX/RCA is ONE mesh object
  (trunk + branches joined) with its OWN material named `Mat_LAD`, `Mat_LCX`, `Mat_RCA` (so the app can recolour
  each one by risk score). Optional extras: `Valve_Aortic`, `Valve_Pulmonary`, `Valve_Mitral`, `Valve_Tricuspid`,
  `Pulmonary_Trunk`.
- **Vertex data for the damage visual:** on each artery write the normalised distance along the main trunk
  (0 at the ostium, 1 at the distal end; branches inherit their parent's value at the junction) into the **first
  vertex-colour layer, red channel** (name it `along`). Export it (glTF `COLOR_0`).
- Add **empties** (exported as nodes) named `focus_LAD`, `focus_LCX`, `focus_RCA` at the middle of each artery,
  and `focus_inside` in the middle of the heart, for camera fly-to targets.
- Orientation/scale: apply all transforms; heart centred at the origin; **glTF Y-up**, anterior facing **+Z**
  (so the apex points down and slightly to the viewer's right in the front view), height about 2.2 units.
  No animations, no cameras, no lights in the export. Normals smooth, no n-gons, no loose geometry.
- Export: glTF Binary (.glb), Y-up, "Apply modifiers" on, materials exported, vertex colours exported, tangents off.
  Save to `C:\Users\Admin\Documents\gokul\CAD-detection\frontend\public\models\heart-realistic.glb`
  and keep the .blend at `C:\Users\Admin\Documents\gokul\CAD-detection\assets\3d\heart-realistic.blend`.

## Process
1. Inspect the scene, import and orient the scan, report vertex/triangle counts.
2. Clean + decimate the scan; show a front, back and apex screenshot.
3. Build each artery tree (LAD, then LCX, then RCA) and show a screenshot after each.
4. Materials, naming, vertex-colour `along`, empties.
5. Export, then re-import the GLB into a fresh scene to verify names, triangle counts, materials and file size.
6. Give me a short report: file path, file size, triangle counts per object, and a list of known weaknesses
   (e.g. posterior surface, branch accuracy). Do not edit anything in `frontend/src`; I will wire the GLB into the
   app afterwards.

Anatomy note: this is for a research/teaching prototype. Artery layout should follow standard textbook anatomy, but
it is not patient-specific, and it must not be described as a medical-grade reconstruction.
