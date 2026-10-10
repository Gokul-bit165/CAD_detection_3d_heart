import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError } from '../services/api'
import type { FeatureSchema, Health, ModelInfo } from '../types/api'

interface AppData {
  schema: FeatureSchema | null
  schemaError: string | null
  health: Health | null
  modelInfo: ModelInfo | null
  apiOnline: boolean | null // null = still checking
  refresh: () => void
}

const Ctx = createContext<AppData | null>(null)
export const useAppData = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAppData outside provider')
  return v
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [schema, setSchema] = useState<FeatureSchema | null>(null)
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [h, m] = await Promise.all([api.health(), api.modelInfo()])
      setHealth(h); setModelInfo(m); setApiOnline(true)
      setSchema((s) => s) // keep
      if (!schema) {
        try { setSchema(await api.features()); setSchemaError(null) }
        catch (e) { setSchemaError(e instanceof ApiError ? e.message : 'Failed to load feature schema') }
      }
    } catch {
      setApiOnline(false); setHealth(null); setModelInfo(null)
    }
  }, [schema])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 20000)
    return () => clearInterval(t)
  }, [refresh])

  const value = useMemo(() => ({ schema, schemaError, health, modelInfo, apiOnline, refresh }),
    [schema, schemaError, health, modelInfo, apiOnline, refresh])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
