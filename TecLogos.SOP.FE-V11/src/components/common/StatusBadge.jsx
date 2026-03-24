import { getStatusInfo } from '../../utils/sopUtils'

export default function StatusBadge({ status }) {
  const info = getStatusInfo(status)
  return (
    <span className={`badge ${info.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
      {info.label}
    </span>
  )
}
