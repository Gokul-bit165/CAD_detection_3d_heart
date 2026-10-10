# Feature Dictionary: Z-Alizadeh Sani CAD Dataset

This feature dictionary provides a comprehensive medical and statistical reference for the clinical variables in the **Extension of Z-Alizadeh Sani Dataset** used in the Multimodal AI Hackathon Track A (CardioVista: Cardiovascular Risk Visualization & Prediction).

The dataset comprises records from patients evaluated for Coronary Artery Disease (CAD) through cardiac catheterization (angiography) alongside clinical, demographic, electrocardiographic (ECG), laboratory, and echocardiographic evaluations.

---

## Target Leakage Warning

> [!WARNING]
> The columns `LAD`, `LCX`, `RCA`, and `Cath` are **ground-truth angiography findings**. When training diagnostic models for overall CAD or single-vessel stenosis, all four target fields must be strictly excluded from the input feature matrix ($X$) to avoid direct target leakage.

---

## 1. Demographic & Anthropometric Features

| Column Name | Data Type | Units / Encoding | Description | Clinical Significance |
| :--- | :--- | :--- | :--- | :--- |
| `Age` | Continuous | Years | Patient age at clinical presentation | Age is one of the strongest unmodifiable risk factors for CAD development. |
| `Weight` | Continuous | kg | Total body weight | Used for hemodynamic and metabolic calculations. |
| `Length` | Continuous | cm | Body height | Used to compute body surface area and BMI. |
| `Sex` | Categorical | `Male`, `Female` | Biological sex | Males typically develop CAD earlier; females have altered post-menopausal risk profiles. |
| `BMI` | Continuous | $\text{kg/m}^2$ | Body Mass Index ($\text{weight} / \text{height}^2$) | Marker for obesity, metabolic syndrome, and systemic vascular inflammation. |

---

## 2. Medical History & Cardiovascular Risk Factors

| Column Name | Data Type | Values | Description |
| :--- | :--- | :--- | :--- |
| `DM` | Binary | `Y` / `N` | **Diabetes Mellitus**: Glycemic dysregulation accelerating vascular atherosclerosis. |
| `HTN` | Binary | `Y` / `N` | **Hypertension**: Elevated systemic arterial pressure promoting endothelial damage. |
| `Current Smoker`| Binary | `Y` / `N` | Active tobacco cigarette smoker at time of admission. |
| `EX-Smoker` | Binary | `Y` / `N` | Patient with prior smoking history who has quit. |
| `FH` | Binary | `Y` / `N` | **Family History**: Documented premature coronary artery disease in first-degree relatives. |
| `Obesity` | Binary | `Y` / `N` | Clinical diagnosis of obesity (typically $\text{BMI} \ge 30$). |
| `CRF` | Binary | `Y` / `N` | **Chronic Renal Failure**: Impaired kidney function elevating cardiovascular morbidity. |
| `CVA` | Binary | `Y` / `N` | **Cerebrovascular Accident**: Prior history of stroke or transient ischemic attack. |
| `Airway disease`| Binary | `Y` / `N` | Documented reactive airway or chronic obstructive pulmonary disease (COPD/Asthma). |
| `Thyroid Disease`| Binary | `Y` / `N` | Hypo- or hyperthyroidism affecting metabolic and cardiovascular hemodynamics. |
| `CHF` | Binary | `Y` / `N` | **Congestive Heart Failure**: History of symptomatic cardiac ventricular insufficiency. |
| `DLP` | Binary | `Y` / `N` | **Dyslipidemia**: Elevated cholesterol/triglycerides or ongoing lipid-lowering therapy. |

---

## 3. Physical Examination & Vital Signs

| Column Name | Data Type | Units / Encoding | Description |
| :--- | :--- | :--- | :--- |
| `BP` | Continuous | mmHg | Systolic blood pressure recorded on admission. |
| `PR` | Continuous | bpm | Resting pulse rate (heart rate). |
| `Edema` | Binary | `0` (No) / `1` (Yes) | Dependent peripheral edema in lower extremities indicative of fluid retention or heart failure. |
| `Weak Peripheral Pulse` | Binary | `0` (Normal) / `1` (Weak) | Diminished radial, femoral, or dorsalis pedis pulses indicating peripheral arterial disease. |
| `Lung rales` | Binary | `0` (Absent) / `1` (Present) | Auscultatory pulmonary crackles indicating left ventricular failure or pulmonary congestion. |
| `Systolic Murmur` | Binary | `0` (Absent) / `1` (Present) | Heart murmur heard during ventricular contraction (aortic stenosis, mitral regurgitation). |
| `Diastolic Murmur` | Binary | `0` (Absent) / `1` (Present) | Heart murmur heard during ventricular filling (aortic regurgitation, mitral stenosis). |

---

## 4. Symptoms & Angina Classification

| Column Name | Data Type | Encoding | Clinical Context |
| :--- | :--- | :--- | :--- |
| `Typical Chest Pain` | Binary | `Y` / `N` (or `1`/`0`) | Substernal chest pressure provoked by exertion/stress and relieved by rest or nitroglycerin. |
| `Dyspnea` | Binary | `Y` / `N` (or `1`/`0`) | Exertional or resting shortness of breath (angina equivalent in elderly/diabetic patients). |
| `Function Class` | Ordinal | `1`, `2`, `3`, `4` | New York Heart Association (NYHA) Functional Classification of cardiovascular limitation. |
| `Atypical` | Binary | `Y` / `N` (or `1`/`0`) | Chest pain meeting only two of the three classic angina criteria. |
| `Nonanginal` | Binary | `Y` / `N` (or `1`/`0`) | Pain meeting fewer than two classic criteria (e.g., musculoskeletal or pleuritic). |
| `Exertional CP` | Binary | `Y` / `N` (or `1`/`0`) | Chest discomfort triggered by physical activity. |
| `LowTH Ang` | Binary | `Y` / `N` (or `1`/`0`) | Low-threshold angina: Chest pain triggered at minimal workload or low physical exertion. |

---

## 5. Electrocardiogram (ECG) Features

| Column Name | Data Type | Encoding | Description |
| :--- | :--- | :--- | :--- |
| `Q Wave` | Binary | `0` / `1` | Pathological Q waves denoting prior transmural myocardial infarction. |
| `St Elevation` | Binary | `0` / `1` | Acute or subacute ST-segment elevation signaling transmural myocardial ischemia/injury. |
| `St Depression` | Binary | `0` / `1` | ST-segment depression indicative of subendocardial ischemia or strain. |
| `Tinversion` | Binary | `0` / `1` | Inverted T-waves representing myocardial ischemia or repolarization abnormalities. |
| `LVH` | Binary | `0` / `1` | Left Ventricular Hypertrophy criteria met on surface 12-lead ECG. |
| `Poor R Progression` | Binary | `0` / `1` | Failure of R-wave amplitude to increase appropriately across leads V1 through V4. |
| `BBB` | Categorical | `N`, `LBBB`, `RBBB` | Bundle Branch Block: Conduction abnormality (Left or Right Bundle Branch Block). |

---

## 6. Laboratory Biomarkers & Hematology

| Column Name | Data Type | Standard Units | Reference Range | Clinical Context |
| :--- | :--- | :--- | :--- | :--- |
| `FBS` | Continuous | mg/dL | 70–99 | Fasting Blood Sugar: Indicator of diabetes and glycemic control. |
| `CR` | Continuous | mg/dL | 0.6–1.2 | Serum Creatinine: Marker of renal filtration capability. |
| `TG` | Continuous | mg/dL | < 150 | Serum Triglycerides: Atherogenic lipid particle indicator. |
| `LDL` | Continuous | mg/dL | < 100 | Low-Density Lipoprotein: Primary atherogenic driver. |
| `HDL` | Continuous | mg/dL | > 40 (M), > 50 (F) | High-Density Lipoprotein: Protective cardioprotective cholesterol. |
| `BUN` | Continuous | mg/dL | 7–20 | Blood Urea Nitrogen: Renal clearance and perfusion indicator. |
| `ESR` | Continuous | mm/hr | 0–20 | Erythrocyte Sedimentation Rate: Non-specific systemic inflammatory marker. |
| `HB` | Continuous | g/dL | 12.0–17.5 | Hemoglobin: Oxygen-carrying capacity; anemia exacerbates angina. |
| `K` | Continuous | mEq/L | 3.5–5.0 | Serum Potassium: Critical electrolyte for cardiac electrophysiology. |
| `Na` | Continuous | mEq/L | 135–145 | Serum Sodium: Fluid balance and osmotic regulator. |
| `WBC` | Continuous | cells/$\mu\text{L}$ | 4,000–11,000 | White Blood Cell Count: Inflammatory marker. |
| `Lymph` | Continuous | % | 20–40 | Differential lymphocyte percentage. |
| `Neut` | Continuous | % | 40–70 | Differential neutrophil percentage; neutrophil-to-lymphocyte ratio reflects stress/inflammation. |
| `PLT` | Continuous | $\times 10^3/\mu\text{L}$ | 150–450 | Platelet count: Determinant of thrombus formation risk. |

---

## 7. Echocardiographic (Echo) Features

| Column Name | Data Type | Encoding / Values | Clinical Description |
| :--- | :--- | :--- | :--- |
| `EF-TTE` | Continuous | Percentage (%) | Left Ventricular Ejection Fraction evaluated by Transthoracic Echocardiogram. Normal: $\ge 50\%$. |
| `Region RWMA` | Ordinal | `0`, `1`, `2`, `3`, `4` | Number of myocardial segments exhibiting Regional Wall Motion Abnormality (hypokinesia/akinesia/dyskinesia). |
| `VHD` | Categorical | `N`, `mild`, `moderate`, `severe` | Valvular Heart Disease severity evaluated via doppler echocardiography. |

---

## 8. Target Variables (Catheterization / Angiography Findings)

These 4 columns serve as prediction targets for clinical risk stratification and 3D vessel mapping:

| Target Name | Type | Classes / Labels | Anatomic Territory & Definition |
| :--- | :--- | :--- | :--- |
| **`LAD`** | Binary | `Stenosis` / `Normal` | **Left Anterior Descending Artery**: Supplies the anterior ventricular wall and interventricular septum. Stenosis is defined as $\ge 50\%$ lumen reduction. |
| **`LCX`** | Binary | `Stenosis` / `Normal` | **Left Circumflex Artery**: Supplies the posterolateral left ventricle and lateral wall. Stenosis defined as $\ge 50\%$ narrowing. |
| **`RCA`** | Binary | `Stenosis` / `Normal` | **Right Coronary Artery**: Supplies the inferior ventricular wall, right ventricle, and sinoatrial/atrioventricular nodes. Stenosis $\ge 50\%$. |
| **`Cath`** | Binary | `CAD` / `Normal` | **Overall Coronary Angiography Finding**: Defined as positive for CAD if significant stenosis ($\ge 50\%$) is present in at least one major epicardial coronary vessel. |
