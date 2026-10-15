import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { History } from 'lucide-react'
import { Alert, Button, Card, EmptyState, Spinner } from '../../components/ui'
import { api, ApiError } from '../../services/api'
import type { PredictionSummary } from '../../types/api'
import { HistoryTable } from '../dashboard/OverviewPage'

export default function HistoryPage() {
  const [rows, setRows] = useState<PredictionSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listPredictions()
      .then(setRows)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load history'))
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">Assessment History</h2>
        <p className="mt-1 text-sm text-ink-3">
          Stored in a local SQLite database. Records contain clinical values, estimated risk probabilities, and model version.
        </p>
      </div>

      {error && <Alert tone="error" title="Could not load history">{error}</Alert>}
      {!rows && !error && <Spinner label="Loading history records" />}

      {rows && (
        <Card className="py-3 border border-line">
          {rows.length === 0 ? (
            <div className="px-5 py-4">
              <EmptyState
                icon={<History className="h-8 w-8 text-ink-3" />}
                title="No saved predictions"
                action={
                  <Link to="/assessment">
                    <Button>New assessment</Button>
                  </Link>
                }
              >
                Run a patient assessment and it will automatically be archived here.
              </EmptyState>
            </div>
          ) : (
            <HistoryTable rows={rows} />
          )}
        </Card>
      )}
    </div>
  )
}