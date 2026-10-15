import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Sparkles } from 'lucide-react'
import { api, ApiError } from '../../services/api'
import type { PredictionResponse } from '../../types/api'
import { Button, Card, EmptyState, Spinner } from '../../components/ui'
import ResultsPage from './ResultsPage'
import { FIXTURE_HIGH } from '../../dev/fixtures'

export default function LatestReportPage() {
  const [loading, setLoading] = useState(true)
  const [latestId, setLatestId] = useState<string | null>(null)
  const [demoData, setDemoData] = useState<PredictionResponse | null>(null)
  const [, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .listPredictions()
      .then((res) => {
        if (cancelled) return
        if (Array.isArray(res) && res.length > 0) {
          setLatestId(res[0].id)
        } else {
          setLatestId(null)
        }
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Unable to load predictions.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner label="Loading latest assessment" />
      </div>
    )
  }

  if (demoData) {
    return <ResultsPage initialData={demoData} />
  }

  if (latestId) {
    return <ResultsPage predictionId={latestId} />
  }

  return (
    <div className="mx-auto max-w-xl py-12">
      <Card className="p-8 text-center">
        <EmptyState
          icon={<ClipboardList className="h-10 w-10 text-accent" />}
          title="No assessments recorded yet"
        >
          Create your first clinical assessment using patient measurements, or load a realistic sample report to explore the 3D heart and model explanations.
        </EmptyState>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/assessment">
            <Button variant="primary">
              <ClipboardList className="h-4 w-4" /> New Assessment
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => setDemoData(FIXTURE_HIGH)}>
            <Sparkles className="h-4 w-4 text-accent" /> Load Sample Report
          </Button>
        </div>
      </Card>
    </div>
  )
}