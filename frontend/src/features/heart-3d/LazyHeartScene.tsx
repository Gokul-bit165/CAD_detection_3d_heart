import { lazy, Suspense } from 'react'
import type { HeartSceneProps } from './HeartScene'
import { cx } from '../../components/ui'

// three.js + R3F are ~1 MB; load them only when a page actually shows the heart.
const HeartScene = lazy(() => import('./HeartScene'))

export default function LazyHeartScene(props: HeartSceneProps) {
  return (
    <Suspense fallback={
      <div role="status" className={cx('grid place-items-center rounded-2xl border border-line bg-white text-sm text-navy-500', props.className)}>
        Loading 3D viewer…
      </div>}>
      <HeartScene {...props} />
    </Suspense>
  )
}
