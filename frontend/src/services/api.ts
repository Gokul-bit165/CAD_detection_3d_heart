import type {
  EvaluationResponse, FeatureSchema, FeatureValues, Health, ImportResponse, ModelInfo, PredictionResponse,
  PredictionSummary,
} from '../types/api'

const BASE: string = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
  ?? 'http://localhost:8000/api/v1'

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
  createPrediction: (features: FeatureValues) =>
    request<PredictionResponse>('/predictions', { method: 'POST', body: JSON.stringify({ features }) }),
  listPredictions: () => request<PredictionSummary[]>('/predictions'),
  getPrediction: (id: string) => request<PredictionResponse>(`/predictions/${encodeURIComponent(id)}`),
  evaluation: () => request<EvaluationResponse>('/evaluation'),
  importExcel: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<ImportResponse>('/import/excel', { method: 'POST', body })
  },
  templateUrl: `${BASE}/import/template`,
}
