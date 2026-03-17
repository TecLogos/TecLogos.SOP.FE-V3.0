import { useEffect, useState } from 'react'
import Modal from './Modal'
import { sopAPI } from '../../services/api'
import { formatDate } from '../../utils/sopUtils'
import { PageLoader } from './Loaders'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const STEP_COLOR = { 1: 'text-emerald-600', 2: 'text-red-600', 0: 'text-amber-500' }
const STEP_ICON  = { 1: CheckCircle2,        2: XCircle,        0: Clock }

// sopTitle is passed from the parent (already in the sop list row)
export default function SopDetailModal({ sopId, sopTitle, open, onClose }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !sopId) return
    setLoading(true)
    sopAPI.getTracking(sopId)
      .then(r => setData(r.data?.data ?? r.data?.Data ?? r.data))
      .catch(() => toast.error('Failed to load SOP details'))
      .finally(() => setLoading(false))
  }, [open, sopId])

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title="SOP Tracking" size="lg">
      {loading ? <PageLoader /> : data ? (
        <div className="space-y-5">

          {/* SOP Title header — replaces SOP ID block */}
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">SOP Title</p>
            <p className="text-sm font-semibold text-gray-800">
              {sopTitle || data.sopTitle || data.SopTitle || '—'}
            </p>
          </div>

          {/* Workflow steps */}
          {(data.Steps ?? data.steps ?? []).length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No workflow steps configured yet.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Workflow Steps</p>
              {(data.Steps ?? data.steps ?? []).map((step, idx) => {
                const status    = step.ApprovalStatus ?? step.approvalStatus
                const Icon      = STEP_ICON[status] ?? Clock
                const color     = STEP_COLOR[status] ?? 'text-gray-400'
                const label     = step.StageStatusLabel ?? step.stageStatusLabel ?? 'Not Yet Reached'
                const stageName = step.StageName ?? step.stageName ?? `Stage ${idx + 1}`
                const level     = step.ApprovalLevel ?? step.approvalLevel
                const isSup     = step.IsSupervisor ?? step.isSupervisor
                const comments  = step.Comments ?? step.comments
                const actionedOn = step.ActionedOn ?? step.actionedOn
                const actionedBy = step.ActionedByEmail ?? step.actionedByEmail

                return (
                  <div key={step.ID ?? step.id ?? idx}
                    className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className={`mt-0.5 shrink-0 ${color}`}>
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">{stageName}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                          {isSup ? 'Supervisor' : `Level ${level}`}
                        </span>
                        <span className={`text-xs font-semibold ${color}`}>{label}</span>
                      </div>
                      {actionedBy  && <p className="text-xs text-gray-500 mt-0.5">By: {actionedBy}</p>}
                      {actionedOn  && <p className="text-xs text-gray-400">{formatDate(actionedOn)}</p>}
                      {comments    && <p className="text-xs text-gray-600 mt-1 italic">"{comments}"</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-gray-400 py-8">No data available.</p>
      )}
    </Modal>
  )
}