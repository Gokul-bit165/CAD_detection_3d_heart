# CardioVista Deployment Guide

This guide gives you the fastest, easiest ways to deploy CardioVista to **Render**, **Vercel**, or **Netlify**.

---

## Architecture Overview

- **Frontend:** React 19 + Vite + Three.js / React Three Fiber + Tailwind CSS v4 SPA.
- **Backend:** FastAPI (Python 3.11) + Uvicorn + SQLite + Scikit-Learn ensemble model.

---

## Option 1: 1-Click Full-Stack on Render (Recommended)

Render can build and run both the Python FastAPI backend and the React frontend static site together using the included `render.yaml` Blueprint.

### Steps:
1. Push your latest code to your GitHub repo (`origin main`).
2. Log in to [Render.com](https://render.com).
3. Click **New +** (top right) -> **Blueprint**.
4. Connect your GitHub repository (`CAD_detection_3d_heart`).
5. Render will detect `render.yaml` and configure:
   - `cardiovista-api`: Python Web Service (FastAPI).
   - `cardiovista-frontend`: Static Site (React Vite) with SPA rewrites.
6. Click **Apply**.
7. In ~2 minutes, both services will be live!

---

## Option 2: Frontend on Vercel + Backend on Render (Fast & Clean)

This is the most popular combination: high-performance global CDN for your React UI on Vercel, paired with a free Python web service on Render.

### Step 1: Deploy Backend to Render (2 mins)
1. In [Render.com](https://render.com), click **New +** -> **Web Service**.
2. Connect your repo and set:
   - **Name:** `cardiovista-api`
   - **Root Directory:** `backend`
   - **Runtime:** `Python`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Under **Advanced / Environment Variables**, add:
   - `PYTHON_VERSION` = `3.11.9`
   - `CORS_ORIGINS` = `*`
4. Click **Deploy Web Service**.
5. Once deployed, copy your backend URL (e.g. `https://cardiovista-api.onrender.com`).

### Step 2: Deploy Frontend to Vercel (1 min)
1. Go to [Vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
2. Import your GitHub repository.
3. In project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click `Edit` and select `frontend`
4. Expand **Environment Variables** and add:
   - `VITE_API_BASE_URL` = `https://cardiovista-api.onrender.com` (your Render URL from Step 1)
5. Click **Deploy**.
6. That's it! `frontend/vercel.json` already handles all SPA rewrites so direct navigation and refreshes never 404.

---

## Option 3: Frontend on Netlify + Backend on Render

1. Deploy the backend on Render as shown in Option 2, Step 1.
2. In [Netlify.com](https://app.netlify.com), click **Add new site** -> **Import an existing project**.
3. Select your GitHub repository.
4. Netlify will automatically detect `netlify.toml` in the repository root:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
5. In **Site configuration > Environment variables**, add:
   - `VITE_API_BASE_URL` = `https://cardiovista-api.onrender.com`
6. Click **Deploy CardioVista**. Netlify handles the rest via `frontend/public/_redirects`.

---

## Option 4: Instant 60-Second Demo / Standalone Mode (No Backend Needed)

CardioVista includes built-in clinical fixtures and offline simulation for all 3D heart visualizations and occlusion impact charts.

If you just need an instant live demo link in 60 seconds without setting up Python:
1. Deploy `frontend` to **Vercel** or **Netlify**.
2. Add one environment variable:
   - `VITE_USE_FIXTURES` = `true`
3. Deploy! The full UI, 3D interactive heart, vessel inspection, assessment forms, and reports work immediately in the browser.

---

## Troubleshooting & Verification

- **Direct links return 404:** Fixed! Both `vercel.json` and `_redirects` are already configured in the repository.
- **CORS error:** The backend CORS middleware defaults to allow all origins (`*`) in production.
- **Model status unavailable:** Render will run `pip install -r backend/requirements.txt`, which includes the pinned versions of `scikit-learn`, `joblib`, `xgboost`, and `lightgbm` needed for the ensemble model.