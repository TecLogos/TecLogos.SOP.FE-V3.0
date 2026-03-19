/**
 * AdminSopTrackingPage (simplified)
 * ──────────────────────────────────
 * • Shows SOP details card
 * • "Take Action" button → Approve / Reject modal (uses SopApproveRejectAPI)
 * • "Download PDF" button appears when SOP ApprovalStatus === 3 (Completed)
 * • NO timeline / workflow steps display — removed as per requirements
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { sopAPI, sopApproveRejectAPI } from '../../services/api'
import { downloadBlob, formatDate, getLevelLabel, getStatusInfo } from '../../utils/sopUtils'
import { Spinner } from '../../shared/components/Loaders'
import Modal from '../../shared/components/Modal'
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle,
  Download, FileText, Calendar, Tag
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminSopTrackingPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const location  = useLocation()
  const passedSop = location.state?.sop

  const [sop, setSop]           = useState(null)
  const [loading, setLoading]   = useState(true)
  const [actionOpen, setAction] = useState(false)
  const [downloading, setDl]    = useState(false)

  const load = () => {
    if (!id) return
    setLoading(true)
    sopAPI.getById(id)
      .then(r => {
        const d = r.data?.data ?? r.data?.Data ?? r.data
        setSop(d)
      })
      .catch(() => toast.error('Failed to load SOP'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  // Normalise fields
  const sopTitle       = sop?.SopTitle      ?? sop?.sopTitle      ?? passedSop?.sopTitle ?? '—'
  const expiryDate     = sop?.ExpirationDate ?? sop?.expirationDate ?? passedSop?.expirationDate
  const approvalLevel  = sop?.ApprovalLevel  ?? sop?.approvalLevel  ?? passedSop?.approvalLevel ?? 0
  const approvalStatus = sop?.ApprovalStatus ?? sop?.approvalStatus ?? passedSop?.status ?? 0
  const sopDocument    = sop?.SopDocument    ?? sop?.sopDocument    ?? passedSop?.sopDocument

  // ApprovalStatus 3 = Completed → allow download
  const isCompleted = approvalStatus === 3
  const statusInfo  = getStatusInfo(approvalStatus)

  const handleDownload = async () => {
    if (!sopDocument) { toast.error('No document attached to this SOP'); return }
    setDl(true)
    try {
      // Try to fetch the file by URL/path stored in sopDocument
      const response = await fetch(sopDocument)
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const filename = sopDocument.split(/[\\/]/).pop() || `SOP_${id}.pdf`
      downloadBlob(blob, filename)
    } catch {
      // Fallback: open in new tab
      window.open(sopDocument, '_blank')
    } finally {
      setDl(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 surface flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 surface space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
   
          <div>
            <h1 className="page-title">SOP Details</h1>
            <p className="text-gray-500 text-sm mt-0.5">Review and take action on this SOP</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAction(true)}
            className="btn-primary"
          >
            <CheckCircle size={15} /> Take Action
          </button>

          {isCompleted && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50"
            >
              {downloading ? <Spinner size="sm" /> : <Download size={15} />}
              Download PDF
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            Back
          </button>
        </div>
      </div>

      {/* ── SOP Detail Card ── */}
      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Title bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-5 flex items-start gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
            <FileText size={22} className="text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{sopTitle}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Status badge */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                {statusInfo.label}
              </span>
              {/* Approval level badge */}
              {approvalLevel > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                  {getLevelLabel(approvalLevel)}
                </span>
              )}
              {/* Completed badge */}
              {isCompleted && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  <CheckCircle size={11} /> PDF available
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Meta info grid */}
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
              <Calendar size={14} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Expiry Date</p>
              <p className={`text-sm font-semibold mt-0.5 ${
                expiryDate && new Date(expiryDate) < new Date()
                  ? 'text-red-600'
                  : 'text-gray-800'
              }`}>
                {formatDate(expiryDate)}
                {expiryDate && new Date(expiryDate) < new Date() && (
                  <span className="ml-1.5 text-xs font-normal text-red-400">(Expired)</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
              <Tag size={14} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Document</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate max-w-xs">
                {sopDocument
                  ? sopDocument.split(/[\\/]/).pop()
                  : <span className="text-gray-400 font-normal italic">No document</span>
                }
              </p>
            </div>
          </div>
        </div>

        {/* Download CTA when completed */}
        {isCompleted && (
          <div className="mx-6 mb-5 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle size={18} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">SOP Completed & Approved</p>
                <p className="text-xs text-emerald-600 mt-0.5">The document is ready to download.</p>
              </div>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 shrink-0"
            >
              {downloading ? <Spinner size="sm" /> : <Download size={14} />}
              Download
            </button>
          </div>
        )}
      </div>

      {/* ── Action Modal ── */}
      <SopActionModal
        open={actionOpen}
        onClose={() => setAction(false)}
        sop={{ id, sopTitle, approvalLevel }}
        onDone={load}
      />
    </div>
  )
}

// ── Approve / Reject Modal ─────────────────────────────────────────────────
function SopActionModal({ open, onClose, sop, onDone }) {
  const [action, setAction]     = useState('approve')
  const [comments, setComments] = useState('')
  const [saving, setSaving]     = useState(false)

  const currentLevel = sop?.approvalLevel ?? 0
  // NextApprovalLevel is set by the backend workflow (SD.ApprovalLevel + 1).
  // Pass it directly — no user dropdown needed.
  const nextApprovalLevel = sop?.nextApprovalLevel ?? sop?.NextApprovalLevel ?? 0
  const isApprove = action === 'approve'

  useEffect(() => {
    if (!open) return
    setAction('approve')
    setComments('')
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isApprove && !comments.trim()) {
      toast.error('Comments are required when rejecting')
      return
    }
    setSaving(true)
    try {
      if (isApprove) {
        await sopApproveRejectAPI.approve(sop.id, comments || null, nextApprovalLevel)
        toast.success('SOP approved successfully')
      } else {
        await sopApproveRejectAPI.reject(sop.id, comments)
        toast.success('SOP rejected')
      }
      onDone?.()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.Message || 'Action failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="SOP Action" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* SOP chip */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1.5">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">SOP</p>
          <p className="text-sm font-semibold text-gray-800">{sop?.sopTitle}</p>
          {currentLevel > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
              {getLevelLabel(currentLevel)}
            </span>
          )}
          {isApprove && nextApprovalLevel > 0 && (
            <p className="text-xs text-gray-400">
              Next stage → <span className="font-semibold text-gray-600">{getLevelLabel(nextApprovalLevel)}</span>
            </p>
          )}
          {isApprove && nextApprovalLevel === 0 && (
            <p className="text-xs text-emerald-600 font-semibold">
              ✓ Final approval — SOP will be marked Completed
            </p>
          )}
        </div>

        {/* Approve / Reject toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setAction('approve')}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
              isApprove
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-200 hover:text-emerald-700'
            }`}>
            <CheckCircle size={14} /> Approve
          </button>
          <button type="button" onClick={() => setAction('reject')}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
              !isApprove
                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-red-200 hover:text-red-700'
            }`}>
            <XCircle size={14} /> Reject
          </button>
        </div>



        {/* Reject warning */}
        {!isApprove && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">
              Rejecting permanently marks this SOP as rejected. Comments required.
            </p>
          </div>
        )}

        {/* Comments */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Comments {!isApprove && <span className="text-red-500">*</span>}
          </label>
          <textarea
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
            value={comments}
            onChange={e => setComments(e.target.value)}
            required={!isApprove}
            placeholder={isApprove ? 'Optional notes…' : 'Reason for rejection (required)…'}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
              isApprove ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            }`}>
            {saving
              ? <><Spinner size="sm" /> Saving…</>
              : isApprove
                ? <><CheckCircle size={14} /> Approve</>
                : <><XCircle size={14} /> Reject</>
            }
          </button>
        </div>
      </form>
    </Modal>
  )
}
