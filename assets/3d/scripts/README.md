# Scan preparation scripts

Run with the project venv (`pip install trimesh fast-simplification scipy pillow numpy rtree`), from the repo root.

1. `python decimate_scan.py <obj> <texture.jpg> <out_dir>/scan200k.glb 200000` - samples the texture per vertex, decimates
   (~200k triangles), centres and scales the heart to ~2.4 units tall.
2. `python seed_vessel_paths.py <out_dir>` - writes `frontend/public/models/heart-scan.glb` (single mesh `Heart_Scan`) and
   `<out_dir>/seed.json`, the seed LAD/LCX/RCA centre-lines that were pasted into `frontend/src/features/heart-3d/vesselPaths.ts`.

The seeds come from a rule (anterior groove / AV groove on the LV vs right side), not from the scan's actual arteries.
Refine them in the app: 3D Heart Explorer -> Place vessels.
