import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { sopApproveRejectAPI } from '../../services/api'
import { normalizeSopItem, formatDate } from '../../utils/sopUtils'
import { EmptyState } from '../../shared/components/Loaders'
import Modal from '../../shared/components/Modal'
import useDebouncedValue from '../../shared/hooks/useDebouncedValue'
import useVirtualRange from '../../shared/hooks/useVirtualRange'
import toast from 'react-hot-toast'
import {
  CheckCircle, XCircle, RefreshCw,
  Search, FileText, AlertCircle, Logs,
} from 'lucide-react'

const ApprovalHistoryModal = lazy(() => import('../../shared/components/ApprovalHistoryModal'))

function numOrNull(val) {
  if (typeof val === 'number' && Number.isFinite(val)) return val
  if (typeof val === 'string') {
    const parsed = Number(val.trim())
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function getFileName(path) {
  return path ? path.split(/[\\/]/).pop() : '—'
}

function ActionModal({ sop, open, onClose, onDone }) {
  const [action, setAction] = useState('approve')
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)

  const approvalLevelNum =
    numOrNull(sop?.approvalLevel) ??
    numOrNull(sop?.ApprovalLevel) ??
    numOrNull(sop?.approvalLevelId) ??
    numOrNull(sop?.ApprovalLevelId) ??
    0

  const canReject = approvalLevelNum > 0
  const nextApprovalLevel = sop?.nextApprovalLevel ?? sop?.NextApprovalLevel ?? 0
  const expirationDateRaw = sop?.expirationDate ?? sop?.ExpirationDate ?? null
  const isExpired = expirationDateRaw ? new Date(expirationDateRaw) < new Date() : false
  const isApprove = action === 'approve'

  useEffect(() => {
    if (!open) return
    setAction('approve')
    setComments('')
  }, [open, sop?.id])

  const submitAction = useCallback(async (selectedAction) => {
    const isSelectedApprove = selectedAction === 'approve'

    if (isExpired) {
      toast.error('This SOP is expired. Approve/Reject is not applicable.')
      return
    }

    if (!isSelectedApprove && !canReject) {
      toast.error('Reject is not available at this stage')
      return
    }

    if (!isSelectedApprove && !comments.trim()) {
      setAction('reject')
      toast.error('Comments are required when rejecting')
      return
    }

    setSaving(true)
    try {
      if (isSelectedApprove) {
        await sopApproveRejectAPI.approve(sop.id, comments || null, nextApprovalLevel)
        toast.success('SOP approved successfully')
      } else {
        await sopApproveRejectAPI.reject(sop.id, comments)
        toast.success('SOP rejected')
      }
      onDone()
      onClose()
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.Message || 'Action failed'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }, [canReject, comments, isExpired, nextApprovalLevel, onClose, onDone, sop?.id])

  if (!sop) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${sop.sopTitle} (${getFileName(sop.sopDocument)})`}
      size="sm"
    >
      <div className="space-y-4">
        {isExpired && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">This SOP is expired. Approve/Reject is not applicable.</p>
          </div>
        )}

        {!isExpired && !isApprove && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl p-3">
            <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">Rejecting will mark this SOP as rejected. Comments are required.</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Comments {!isExpired && !isApprove && <span className="text-red-500">*</span>}
          </label>
          <textarea
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-gray-100 disabled:text-gray-500"
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            disabled={saving || isExpired}
            required={!isExpired && !isApprove}
            placeholder={isApprove ? 'Optional approval notes...' : 'Reason for rejection (required)...'}
          />
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            Cancel
          </button>

          {!isExpired && (
            <>
              <button
                type="button"
                onClick={() => {
                  setAction('approve')
                  submitAction('approve')
                }}
                disabled={saving}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 bg-emerald-600 text-white border-emerald-600 shadow-sm hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                <CheckCircle size={15} /> {saving && action === 'approve' ? 'Approving...' : 'Approve'}
              </button>

              {canReject && (
                <button
                  type="button"
                  onClick={() => {
                    setAction('reject')
                    submitAction('reject')
                  }}
                  disabled={saving}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 bg-red-600 text-white border-red-600 shadow-sm hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  <XCircle size={15} /> {saving && action === 'reject' ? 'Rejecting...' : 'Reject'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

const SopRow = memo(function SopRow({ sop, idx, onReview, onHistory }) {
  const expired = !!sop.expirationDate && new Date(sop.expirationDate) < new Date()

  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      <td className="px-4 py-3 text-center text-gray-400 text-xs whitespace-nowrap">{idx + 1}</td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <FileText size={13} className="text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{sop.sopTitle}</p>
            {sop.remark && <p className="text-xs text-gray-400 truncate">{sop.remark}</p>}
          </div>
        </div>
      </td>

      <td className="px-4 py-3 text-center whitespace-nowrap">{getFileName(sop.sopDocument)}</td>
      <td className="px-4 py-3 text-center whitespace-nowrap">{sop.stageName}</td>
      <td className="px-4 py-3 text-center whitespace-nowrap">{sop.nextStageName}</td>

      <td className="px-4 py-3 text-center whitespace-nowrap">
        <span className={`text-sm ${expired ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
          {formatDate(sop.expirationDate)}
          {expired && <span className="ml-1 text-xs">(Expired)</span>}
        </span>
      </td>

      <td className="px-4 py-3 text-center whitespace-nowrap">
        <div className="inline-flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onReview(sop)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition-colors"
            title="Review"
          >
            <CheckCircle size={12} /> Review
          </button>

          <button
            type="button"
            onClick={() => onHistory(sop.id)}
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-slate-700 transition-colors"
            title="Approval History"
          >
            <Logs size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
})

export default function PendingApprovalsPage() {
  const [allSops, setAllSops] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalSop, setModalSop] = useState(null)
  const [historySopId, setHistorySopId] = useState(null)

  const debouncedSearch = useDebouncedValue(search, 200)

  const load = useCallback(({ force = false } = {}) => {
    setLoading(true)
    sopApproveRejectAPI.getPendingList(undefined, { force })
      .then((response) => {
        const raw = response.data?.data ?? response.data?.Data ?? response.data
        const items = raw?.Items ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
        setAllSops(items.map(normalizeSopItem))
      })
      .catch(() => toast.error('Failed to load pending approvals'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    if (!term) return allSops
    return allSops.filter((sop) => sop.sopTitle?.toLowerCase().includes(term))
  }, [allSops, debouncedSearch])

  const shouldVirtualize = filtered.length >= 250
  const { containerRef, startIndex, endIndex, topSpacer, bottomSpacer } = useVirtualRange({
    enabled: shouldVirtualize,
    itemCount: filtered.length,
    rowHeight: 56,
  })

  const visible = useMemo(() => (
    shouldVirtualize ? filtered.slice(startIndex, endIndex) : filtered
  ), [endIndex, filtered, shouldVirtualize, startIndex])

  const emptyTitle = search.trim() ? 'No matching SOPs' : 'No pending approvals'
  const emptyDesc = search.trim() ? 'Try adjusting your search' : "You're all caught up - nothing needs action right now"

  const handleReview = useCallback((sop) => setModalSop(sop), [])
  const handleHistory = useCallback((sopId) => setHistorySopId(sopId), [])

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Pending Approvals</h1>
          <p className="text-gray-500 text-sm mt-1">SOPs assigned to you for review and approval action</p>
        </div>
        <button
          type="button"
          onClick={() => load({ force: true })}
          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-slate-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search SOP title"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-72 pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        {!!search.trim() && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            <XCircle size={13} /> Clear
          </button>
        )}
      </div>

      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-12 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title={emptyTitle} desc={emptyDesc} />
        ) : (
          <div className="overflow-x-auto">
            <div ref={containerRef} className={shouldVirtualize ? 'overflow-y-auto max-h-[60vh]' : 'overflow-y-visible'}>
              <table className="w-full table-auto border-collapse text-sm min-w-[760px]">
                <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">SOP Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">SOP Document</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Stage</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Stage</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiry</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {shouldVirtualize && topSpacer > 0 && (
                    <tr aria-hidden>
                      <td colSpan={7} style={{ height: topSpacer, padding: 0, border: 0 }} />
                    </tr>
                  )}

                  {visible.map((sop, index) => {
                    const realIdx = shouldVirtualize ? startIndex + index : index
                    return (
                      <SopRow
                        key={sop.id}
                        sop={sop}
                        idx={realIdx}
                        onReview={handleReview}
                        onHistory={handleHistory}
                      />
                    )
                  })}

                  {shouldVirtualize && bottomSpacer > 0 && (
                    <tr aria-hidden>
                      <td colSpan={7} style={{ height: bottomSpacer, padding: 0, border: 0 }} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Showing {filtered.length} of {allSops.length} pending SOP{allSops.length !== 1 ? 's' : ''}
        </p>
      )}

      <ActionModal
        sop={modalSop}
        open={!!modalSop}
        onClose={() => setModalSop(null)}
        onDone={() => load({ force: true })}
      />

      {historySopId && (
        <Suspense fallback={null}>
          <ApprovalHistoryModal
            sopId={historySopId}
            open={!!historySopId}
            onClose={() => setHistorySopId(null)}
          />
        </Suspense>
      )}
    </div>
  )
}

