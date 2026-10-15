import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppDataProvider } from './AppData'
import { ThemeProvider } from './theme'
import AppShell from './AppShell'
import OverviewPage from '../features/dashboard/OverviewPage'
import AssessmentPage from '../features/patient-assessment/AssessmentPage'
import HistoryPage from '../features/history/HistoryPage'
import AboutPage from '../features/settings/AboutPage'

const LatestReportPage = lazy(() => import('../features/predictions/LatestReportPage'))
const ResultsPage = lazy(() => import('../features/predictions/ResultsPage'))
const ExplorerPage = lazy(() => import('../features/heart-3d/ExplorerPage'))
const ImportPage = lazy(() => import('../features/import/ImportPage'))
const EvaluationPage = lazy(() => import('../features/model-evaluation/EvaluationPage'))

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-ink-3">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        Loading...
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppDataProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route
                index
                element={
                  <Suspense fallback={<PageFallback />}>
                    <LatestReportPage />
                  </Suspense>
                }
              />
              <Route path="overview" element={<OverviewPage />} />
              <Route path="assessment" element={<AssessmentPage />} />
              <Route
                path="results/:id"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ResultsPage />
                  </Suspense>
                }
              />
              <Route
                path="import"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ImportPage />
                  </Suspense>
                }
              />
              <Route
                path="explorer"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ExplorerPage />
                  </Suspense>
                }
              />
              <Route path="history" element={<HistoryPage />} />
              <Route
                path="evaluation"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <EvaluationPage />
                  </Suspense>
                }
              />
              <Route path="about" element={<AboutPage />} />
              <Route
                path="*"
                element={
                  <div className="py-20 text-center text-ink-3">
                    <p className="text-lg font-semibold text-ink">Page not found</p>
                    <p className="mt-1 text-sm">The requested URL does not exist.</p>
                  </div>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppDataProvider>
    </ThemeProvider>
  )
}