export const SOP_STATUS = {
  0: { label: 'Not Started',          color: 'bg-surface-100 text-surface-600',    dot: 'bg-surface-400' },
  1: { label: 'In Progress',          color: 'bg-amber-50 text-amber-700',          dot: 'bg-amber-500' },
  2: { label: 'Submitted',            color: 'bg-blue-50 text-blue-700',            dot: 'bg-blue-500' },
  3: { label: 'Pending Approval L1',  color: 'bg-violet-50 text-violet-700',        dot: 'bg-violet-500' },
  4: { label: 'Pending Approval L2',  color: 'bg-purple-50 text-purple-700',        dot: 'bg-purple-500' },
  5: { label: 'Pending Approval L3',  color: 'bg-fuchsia-50 text-fuchsia-700',      dot: 'bg-fuchsia-500' },
  6: { label: 'Rejected',             color: 'bg-red-50 text-red-700',              dot: 'bg-red-500' },
  7: { label: 'Completed',            color: 'bg-emerald-50 text-emerald-700',      dot: 'bg-emerald-500' },
  8: { label: 'Expired',              color: 'bg-surface-100 text-surface-500',     dot: 'bg-surface-400' },
}

export function getStatusInfo(status) {
  return SOP_STATUS[status] ?? { label: 'Unknown', color: 'bg-surface-100 text-surface-500', dot: 'bg-surface-400' }
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

export function isExpired(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
