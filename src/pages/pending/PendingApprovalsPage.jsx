/**
 * PendingApprovalsPage
 * ─────────────────────
 * Single dynamic page for ALL roles (Approver, Supervisor, etc.)
 * Calls GET /api/v1/SopApproveReject/pending-list  (backend filters by userId)
 *
 * NextApprovalLevel is returned by the backend in each SOP record
 * (SQL: WF.ApprovalLevel WHERE WF.ApprovalLevel = SD.ApprovalLevel + 1)
 * → No dropdown needed. We pass it through automatically on approve.
 */
import { useEffect, useState, useCallback } from 'react'
import { sopApproveRejectAPI } from '../../services/api'
import { normalizeSopItem, formatDate, getStatusInfo, getLevelLabel } from '../../utils/sopUtils'
import { Spinner, EmptyState } from '../../shared/components/Loaders'
import Modal from '../../shared/components/Modal'
import toast from 'react-hot-toast'
import {
  CheckCircle, XCircle, RefreshCw, Clock,
  Search, ChevronDown, FileText, AlertCircle, Filter
} from 'lucide-react'

// ── Level badge ────────────────────────────────────────────────────────────
const LEVEL_COLOR = {
  2: 'bg-sky-100 text-sky-700 border-sky-200',
  3: 'bg-violet-100 text-violet-700 border-violet-200',
  4: 'bg-purple-100 text-purple-700 border-purple-200',
  5: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
}

function LevelBadge({ level }) {
  const label = getLevelLabel(level)
  const color = LEVEL_COLOR[level] || 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {label}
    </span>
  )
}

// ── Approval Action Modal ──────────────────────────────────────────────────
// NextApprovalLevel is taken directly from sop.nextApprovalLevel (backend-calculated).
// No dropdown — the workflow order is fully defined server-side.
function ActionModal({ sop, open, onClose, onDone }) {
  const [action, setAction]     = useState('approve')
  const [comments, setComments] = useState('')
  const [saving, setSaving]     = useState(false)

  // Backend returns NextApprovalLevel in the pending-list query result.
  // SQL: WF.ApprovalLevel WHERE WF.ApprovalLevel = SD.ApprovalLevel + 1
  // This is the correct next stage in the workflow — no user selection needed.
  const nextApprovalLevel = sop?.nextApprovalLevel ?? sop?.NextApprovalLevel ?? 0

  useEffect(() => {
    if (!open) return
    setAction('approve')
    setComments('')
  }, [open, sop?.id])

  const isApprove = action === 'approve'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isApprove && !comments.trim()) {
      toast.error('Comments are required when rejecting')
      return
    }
    setSaving(true)
    try {
      if (isApprove) {
        // Pass nextApprovalLevel straight from backend — no manual input
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
  }

  if (!sop) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isApprove ? '✅ Approve SOP' : '❌ Reject SOP'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* SOP info chip */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">SOP</p>
          <p className="text-sm font-semibold text-gray-800">{sop.sopTitle}</p>
          <div className="flex gap-2 mt-1 flex-wrap items-center">
            <LevelBadge level={sop.approvalLevel} />
            {sop.expirationDate && (
              <span className="text-xs text-gray-400">Expires {formatDate(sop.expirationDate)}</span>
            )}
          </div>
          {/* Show the auto-determined next level as read-only info */}
          {isApprove && nextApprovalLevel > 0 && (
            <p className="text-xs text-gray-400 pt-1">
              Next stage →{' '}
              <span className="font-semibold text-gray-600">{getLevelLabel(nextApprovalLevel)}</span>
            </p>
          )}
          {isApprove && nextApprovalLevel === 0 && (
            <p className="text-xs text-emerald-600 font-semibold pt-1">
              ✓ This is the final approval — SOP will be marked Completed
            </p>
          )}
        </div>

        {/* Approve / Reject toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAction('approve')}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
              isApprove
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-200 hover:text-emerald-700'
            }`}
          >
            <CheckCircle size={15} /> Approve
          </button>
          <button
            type="button"
            onClick={() => setAction('reject')}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
              !isApprove
                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-red-200 hover:text-red-700'
            }`}
          >
            <XCircle size={15} /> Reject
          </button>
        </div>

        {/* Reject warning */}
        {!isApprove && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl p-3">
            <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">
              Rejecting will mark this SOP as rejected. Comments are required.
            </p>
          </div>
        )}

        {/* Comments */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Comments {!isApprove && <span className="text-red-500">*</span>}
          </label>
          <textarea
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={comments}
            onChange={e => setComments(e.target.value)}
            required={!isApprove}
            placeholder={
              isApprove
                ? 'Optional approval notes…'
                : 'Reason for rejection (required)…'
            }
          />
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors ${
              isApprove
                ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
                : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
            }`}
          >
            {saving ? (
              <><Spinner size="sm" /> Saving…</>
            ) : isApprove ? (
              <><CheckCircle size={14} /> Approve</>
            ) : (
              <><XCircle size={14} /> Reject</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function PendingApprovalsPage() {
  const [sops, setSops]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [yearFilter, setYear]   = useState('')
  const [modalSop, setModalSop] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (yearFilter) params.year = yearFilter
    sopApproveRejectAPI.getPendingList(params)
      .then(r => {
        const raw   = r.data?.data ?? r.data?.Data ?? r.data
        const items = raw?.Items ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
        setSops(items.map(normalizeSopItem))
      })
      .catch(() => toast.error('Failed to load pending approvals'))
      .finally(() => setLoading(false))
  }, [yearFilter])

  useEffect(() => { load() }, [load])

  const filtered = sops.filter(s =>
    !search || s.sopTitle?.toLowerCase().includes(search.toLowerCase())
  )

  const levels = [...new Set(sops.map(s => s.approvalLevel))].sort()
  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2]

  return (
    <div className="min-h-screen p-6 surface space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Pending Approvals</h1>
          <p className="text-gray-500 text-sm mt-1">
            SOPs assigned to you for review and approval action
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-slate-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Summary cards */}
      {!loading && sops.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card-surface border border-gray-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <Clock size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{sops.length}</p>
              <p className="text-xs text-gray-500">Total Pending</p>
            </div>
          </div>
          {levels.map(l => (
            <div key={l} className="card-surface border border-gray-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                <FileText size={14} className="text-violet-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {sops.filter(s => s.approvalLevel === l).length}
                </p>
                <p className="text-xs text-gray-500">{getLevelLabel(l)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search SOP title…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={yearFilter}
            onChange={e => setYear(e.target.value)}
            className="pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 appearance-none cursor-pointer"
          >
            <option value="">All Years</option>
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? 'No matching SOPs' : 'No pending approvals'}
            desc={search ? 'Try clearing your search' : "You're all caught up — nothing needs action right now"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse text-sm min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                  <th className="px-4 py-3 text-left   text-xs font-semibold text-gray-500 uppercase tracking-wide">SOP Title</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Level</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Level</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiry</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((sop, idx) => (
                  <SopRow
                    key={sop.id}
                    sop={sop}
                    idx={idx}
                    onAction={() => setModalSop(sop)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination hint */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Showing {filtered.length} of {sops.length} pending SOP{sops.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Action Modal */}
      <ActionModal
        sop={modalSop}
        open={!!modalSop}
        onClose={() => setModalSop(null)}
        onDone={load}
      />
    </div>
  )
}

// ── Row component ──────────────────────────────────────────────────────────
function SopRow({ sop, idx, onAction }) {
  const isExpired = sop.expirationDate && new Date(sop.expirationDate) < new Date()
  const nextLevel = sop.nextApprovalLevel ?? sop.NextApprovalLevel ?? 0

  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      <td className="px-4 py-3 text-center text-gray-400 text-xs">{idx + 1}</td>

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

      <td className="px-4 py-3 text-center">
        <LevelBadge level={sop.approvalLevel} />
      </td>

      <td className="px-4 py-3 text-center">
        {nextLevel > 0
          ? <LevelBadge level={nextLevel} />
          : <span className="text-xs text-emerald-600 font-semibold">Final</span>
        }
      </td>

      <td className="px-4 py-3 text-center">
        <span className={`text-sm ${isExpired ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
          {formatDate(sop.expirationDate)}
          {isExpired && <span className="ml-1 text-xs">(Expired)</span>}
        </span>
      </td>

      <td className="px-4 py-3 text-center">
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition-colors"
        >
          <CheckCircle size={12} /> Review
        </button>
      </td>
    </tr>
  )
}
