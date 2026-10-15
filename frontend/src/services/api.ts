import type {
  EvaluationResponse, FeatureSchema, FeatureValues, Health, ImportResponse, ModelInfo, PredictionResponse,
  PredictionSummary,
} from '../types/api'
import { getFixture, isFixtureId, listFixtureSummaries, FIXTURE_HIGH } from '../dev/fixtures'

function resolveBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, '')
  if (!raw) return 'http://localhost:8000/api/v1'
  const withProtocol = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`
  return withProtocol.endsWith('/api/v1') ? withProtocol : `${withProtocol}/api/v1`
}

const BASE: string = resolveBaseUrl()

const USE_FIXTURES = import.meta.env.VITE_USE_FIXTURES === 'true'

export class ApiError extends Error {
  /** Per-request validation problems, when the server returned any. */
  problems: string[]
  status: number
  constructor(message: string, status: number, problems: string[] = []) {
    super(message)
    this.status = status
    this.problems = problems
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: init?.body instanceof FormData ? init?.headers : { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError('Cannot reach the CardioVista API. Is the backend running?', 0)
  }
  if (!res.ok) {
    let problems: string[] = []
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      const d = body?.detail
      if (typeof d === 'string') message = d
      else if (Array.isArray(d)) {
        problems = d.map((e: { msg?: string }) => (e.msg ?? '').replace(/^Value error, /, ''))
        message = 'The submitted values were rejected.'
      }
    } catch { /* non-JSON error body */ }
    throw new ApiError(message, res.status, problems)
  }
  return res.json() as Promise<T>
}

export const api = {
  health: () => request<Health>('/health'),
  modelInfo: () => request<ModelInfo>('/model-info'),
  features: () => request<FeatureSchema>('/features'),

  createPrediction: (features: FeatureValues) => {
    if (USE_FIXTURES) return Promise.resolve(FIXTURE_HIGH)
    return request<PredictionResponse>('/predictions', { method: 'POST', body: JSON.stringify({ features }) })
  },

  listPredictions: () => {
    if (USE_FIXTURES) return Promise.resolve(listFixtureSummaries() as PredictionSummary[])
    return request<PredictionSummary[]>('/predictions')
  },

  getPrediction: (id: string) => {
    if (isFixtureId(id)) return Promise.resolve(getFixture(id))
    return request<PredictionResponse>(`/predictions/${encodeURIComponent(id)}`)
  },

  evaluation: () => request<EvaluationResponse>('/evaluation'),

  importExcel: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<ImportResponse>('/import/excel', { method: 'POST', body })
  },

  importFile: async (file: File) => {
    const isXlsx = file.name.toLowerCase().endsWith('.xlsx')
    const body = new FormData()
    body.append('file', file)
    try {
      return await request<ImportResponse>('/import/file', { method: 'POST', body })
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        if (isXlsx) {
          // Graceful fallback to /import/excel while backend /import/file is in development
          return await request<ImportResponse>('/import/excel', { method: 'POST', body })
        }
        throw new ApiError(
          'The backend endpoint POST /api/v1/import/file has not been added to routes.py yet. For now, please upload an .xlsx workbook or add the endpoint on the backend.',
          404
        )
      }
      throw err
    }
  },

  templateUrl: `${BASE}/import/template`,
  templateCsvUrl: `${BASE}/import/template.csv`,
}
