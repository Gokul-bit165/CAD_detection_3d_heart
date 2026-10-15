import { ChevronDown, ShieldAlert } from 'lucide-react'

interface CaveatsCardProps {
  modelVersion?: string | null
  className?: string
}

export default function CaveatsCard({ modelVersion, className = '' }: CaveatsCardProps) {
  return (
    <details
      className={`group rounded-2xl border border-line bg-surface p-4 shadow-sm transition-all duration-200 ${className}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-ink-2 hover:text-ink">
        <span className="flex items-center gap-1.5 uppercase tracking-wider">
          <ShieldAlert className="h-3.5 w-3.5 text-warn" /> Clinical Caveats & Model Limitations
        </span>
        <ChevronDown className="h-4 w-4 text-ink-3 transition-transform group-open:rotate-180" />
      </summary>

      <div className="mt-3 pt-3 border-t border-line/60 space-y-2 text-xs leading-relaxed text-ink-3">
        <p>
          <strong className="text-ink">Model engine:</strong>{' '}
          {modelVersion ?? '2026-10-ens5 (stacked clinical ensemble)'}
        </p>
        <p>
          <strong className="text-ink">What this model cannot tell:</strong> This estimate is derived solely from non-imaging clinical history, ECG patterns, and serum laboratory markers. The model cannot locate specific anatomical lesions, measure lumen narrowing percentages, or determine plaque morphology.
        </p>
        <p>
          <strong className="text-ink">Screening context:</strong> High probabilities indicate statistical concordance with patients who had coronary stenosis on angiography in the training cohort. A negative prediction does not preclude coronary artery disease.
        </p>
      </div>
    </details>
  )
}