import { CheckSquare } from 'lucide-react'
import { Card } from '../../../components/ui'

export default function NextStepsCard({ className = '' }: { className?: string }) {
  return (
    <Card className={`p-4 shadow-sm border border-line space-y-2.5 ${className}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 flex items-center gap-1.5">
        <CheckSquare className="h-3.5 w-3.5 text-accent" /> Recommended Next Steps
      </h3>
      <ul className="space-y-1.5 text-xs text-ink-2">
        <li className="flex items-start gap-2">
          <span className="text-accent font-bold mt-0.5">•</span>
          <span>Discuss these results with a board-certified cardiologist.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-accent font-bold mt-0.5">•</span>
          <span>Consider confirmatory testing as clinically indicated (e.g. stress testing, coronary CTA, or angiography).</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-accent font-bold mt-0.5">•</span>
          <span>Review modifiable risk factors listed in the patient snapshot on the left.</span>
        </li>
      </ul>
    </Card>
  )
}