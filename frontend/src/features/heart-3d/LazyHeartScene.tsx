import { lazy, Suspense } from 'react'
import type { HeartSceneProps } from './HeartScene'
import type { VesselFinding, VesselId } from '../../types/api'
import { cx } from '../../components/ui'

const HeartScene = lazy(() => import('./HeartScene'))

export interface ExtendedHeartSceneProps extends HeartSceneProps {
  findings?: VesselFinding[] | null
  onTourStep?: (step: { index: number; total: number; vessel: VesselId; status: string } | null) => void
}

export default function LazyHeartScene(props: ExtendedHeartSceneProps) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className={cx(
            'grid place-items-center rounded-2xl border border-line bg-surface text-sm text-ink-3',
            props.className
          )}
        >
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            Loading 3D Heart...
          </div>
        </div>
      }
    >
      <HeartScene {...(props as any)} />
    </Suspense>
  )
}