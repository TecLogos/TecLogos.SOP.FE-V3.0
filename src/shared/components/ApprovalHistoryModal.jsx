import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import { sopAPI } from '../../services/api'
import StatusBadge from './StatusBadge'
import { Spinner, EmptyState } from './Loaders'
import toast from 'react-hot-toast'

function fileName(doc) {
  return doc ? doc.split(/[\\/]/).pop() : null
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const value = new Date(dateStr)
  if (Number.isNaN(value.getTime())) return '-'
  return value.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function unwrapApiData(payload) {
  let value = payload
  for (let index = 0; index < 3; index += 1) {
    if (!value || typeof value !== 'object') break
    const inner = value.data ?? value.Data
    if (!inner || inner === value) break
    value = inner
  }
  return value
}

function buildRowKey(item, index) {
  return [
    item.stageName ?? item.StageName ?? 'stage',
    item.created ?? item.Created ?? index,
    item.createdBy ?? item.CreatedBy ?? 'user',
    item.approvalStatus ?? item.ApprovalStatus ?? 'status',
  ].join(':')
}

export default function ApprovalHistoryModal({ sopId, open, onClose }) {
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !sopId) return undefined

    let cancelled = false
    setLoading(true)
    setError('')

    sopAPI.getById(sopId)
      .then((response) => {
        if (cancelled) return
        setDetail(unwrapApiData(response.data))
      })
      .catch((err) => {
        const message = err.response?.data?.message || err.response?.data?.Message || 'Failed to load approval history'
        if (!cancelled) {
          setError(message)
          toast.error(message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, sopId])

  const history = useMemo(() => {
    const list =
      detail?.sopApprovalHistoryResponseList ??
      detail?.SopApprovalHistoryResponseList ??
      detail?.sopApprovalHistoryList ??
      detail?.SopApprovalHistoryList ??
      []

    if (!Array.isArray(list)) return []

    return [...list].sort((left, right) => {
      const leftDate = new Date(left?.created ?? left?.Created ?? 0).getTime()
      const rightDate = new Date(right?.created ?? right?.Created ?? 0).getTime()
      return rightDate - leftDate
    })
  }, [detail])

  const modalTitle = useMemo(() => {
    if (!detail) return 'Approval History'
    const title = detail.sopTitle ?? detail.SopTitle ?? 'SOP'
    const document = fileName(detail.sopDocument ?? detail.SopDocument)

    return (
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-gray-500">Approval History -</span>
        <span className="block">{document ? `${title} (${document})` : title}</span>
      </span>
    )
  }, [detail])

  return (
    <Modal open={open} onClose={onClose} title={modalTitle} size="2xl">
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <EmptyState title="Unable to load history" desc={error} />
      ) : !detail ? (
        <EmptyState title="No details" desc="Unable to load SOP details." />
      ) : history.length === 0 ? (
        <EmptyState title="No approval history" desc="No actions have been recorded for this SOP yet." />
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
          <table className="w-full table-auto border-collapse text-sm min-w-[1024px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-56">Stage</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-[520px]">Comments</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((item, index) => {
                const rowStatus = item.approvalStatus ?? item.ApprovalStatus
                return (
                  <tr key={buildRowKey(item, index)} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.stageName ?? item.StageName ?? '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {typeof rowStatus !== 'undefined' ? <StatusBadge status={Number(rowStatus)} /> : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[520px] whitespace-normal break-words">{item.comments ?? item.Comments ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{item.createdBy ?? item.CreatedBy ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(item.created ?? item.Created)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
