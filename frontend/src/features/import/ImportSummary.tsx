import { Upload } from 'lucide-react'
import type { ImportResponse } from '../../types/api'
import { Alert, Badge } from '../../components/ui'

interface ImportSummaryProps {
  data: ImportResponse
  fileName?: string
  className?: string
}

export default function ImportSummary({
  data,
  fileName,
  className = '',
}: ImportSummaryProps) {
  const valid = data.rows.filter((r) => r.features && !r.errors.length)
  const invalid = data.rows.length - valid.length

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {fileName && (
          <Badge tone="blue">
            <Upload className="h-3 w-3" /> {fileName}
            {data.sheet ? ` • sheet "${data.sheet}"` : ''}
          </Badge>
        )}
        <Badge tone="teal">{valid.length} valid row{valid.length === 1 ? '' : 's'}</Badge>
        {invalid > 0 && <Badge tone="red">{invalid} with validation errors</Badge>}
      </div>

      {data.ignored_outcome_columns.length > 0 && (
        <Alert tone="info" title="Outcome columns ignored (target leakage prevention)">
          {data.ignored_outcome_columns.join(', ')}{' '}
          {data.ignored_outcome_columns.length > 1 ? 'were' : 'was'} found in the file and
          deliberately excluded from inputs to prevent leakage.
        </Alert>
      )}

      {data.ignored_unknown_columns.length > 0 && (
        <Alert tone="warn" title="Unrecognised columns ignored">
          {data.ignored_unknown_columns.join(', ')}
        </Alert>
      )}

      {data.missing_columns.length > 0 && (
        <Alert tone="warn" title={`${data.missing_columns.length} columns missing from file`}>
          Blank optional values are filled with training-set medians: {data.missing_columns.join(', ')}.
        </Alert>
      )}
    </div>
  )
}