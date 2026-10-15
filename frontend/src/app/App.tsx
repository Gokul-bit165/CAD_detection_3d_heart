import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppDataProvider } from './AppData'
import AppShell from './AppShell'
import OverviewPage from '../features/dashboard/OverviewPage'
import AssessmentPage from '../features/patient-assessment/AssessmentPage'
import ImportPage from '../features/import/ImportPage'
import ExplorerPage from '../features/heart-3d/ExplorerPage'
import ResultsPage from '../features/predictions/ResultsPage'
import HistoryPage from '../features/history/HistoryPage'
import EvaluationPage from '../features/model-evaluation/EvaluationPage'
import AboutPage from '../features/settings/AboutPage'

export default function App() {
  return (
    <AppDataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="assessment" element={<AssessmentPage />} />
            <Route path="results/:id" element={<ResultsPage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="explorer" element={<ExplorerPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="evaluation" element={<EvaluationPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="*" element={<p className="py-20 text-center text-navy-500">Page not found.</p>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppDataProvider>
  )
}
