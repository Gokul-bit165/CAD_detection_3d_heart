# Asset Attribution & Open Source Licenses

This project incorporates clinical datasets, anatomical 3D assets, and medical references under open-source and open-access licenses.

---

## 1. 3D Anatomical Assets

### BodyParts3D
* **Provider**: Database Center for Life Science (DBCLS), Research Organization of Information and Systems (ROIS), Japan / University of Tokyo.
* **URL**: [https://lifesciencedb.jp/bp3d/](https://lifesciencedb.jp/bp3d/)
* **License**: Creative Commons Attribution-ShareAlike 2.1 Japan ([CC BY-SA 2.1 JP](https://creativecommons.org/licenses/by-sa/2.1/jp/))
* **Usage**: Segmented organ models of the human circulatory system, thoracic cavity, aorta, coronary arterial tree, and cardiac chambers used in anatomical reference pipelines located in `assets/3d/source/bodyparts3d-original/`.

### Sketchfab 3D Anatomical Models
* **Source**: Sketchfab 3D Heart and Coronary Vessel meshes (`sketchfab-heart.png` reference).
* **URL**: [https://sketchfab.com](https://sketchfab.com)
* **License**: Creative Commons Attribution ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/))
* **Attribution**: Original cardiovascular mesh architecture created by scientific 3D contributors and adapted into the runtime glTF 2.0 asset (`frontend/public/models/coronary-heart.glb`) with tagged vascular nodes (`LAD`, `LCX`, `RCA`, `Aorta`).

---

## 2. Clinical Datasets

### Extension of Z-Alizadeh Sani Dataset
* **Authors**: Zahra Alizadeh Sani, et al.
* **Archive**: [UCI Machine Learning Repository - Dataset 411](https://archive.ics.uci.edu/dataset/411/extention+of+z)
* **Citation**:
  > Alizadeh Sani, Z., et al. "A database of patients suspected of coronary artery disease." *Computer Methods and Programs in Biomedicine*, 2013 / 2017 extension.
* **License**: Creative Commons Attribution 4.0 International ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/))
* **Content**: 303 patient records across 59 features, with angiography ground-truth labels for left anterior descending (`LAD`), left circumflex (`LCX`), right coronary artery (`RCA`), and overall CAD catheterization (`Cath`).

---

## 3. Hackathon & Challenge Materials

* **Event**: Multimodal AI Hackathon 2026
* **Track**: Track A – Cardiovascular Risk Visualization & Prediction
* **Specification Document**: [`docs/Track_A_Cardiovascular_Challenge.pdf`](file:///mnt/c/Users/Admin/Documents/gokul/CAD-detection/docs/Track_A_Cardiovascular_Challenge.pdf)

---

## 4. Software Libraries & Runtimes

* **Three.js**: MIT License (Copyright © 2010-2026 Three.js authors)
* **FastAPI**: MIT License (Copyright © 2018-2026 Sebastián Ramírez)
* **scikit-learn**: BSD 3-Clause License
* **SHAP (SHapley Additive exPlanations)**: MIT License (Copyright © Scott Lundberg)
