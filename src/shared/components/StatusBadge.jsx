import { getStatusInfo } from '../../utils/sopUtils'

export default function StatusBadge({ status }) {
  const info = getStatusInfo(status)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${info.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
      {info.label}
    </span>
  )
}
