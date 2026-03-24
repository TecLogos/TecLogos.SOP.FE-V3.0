import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { sopAPI, sopApproveRejectAPI } from '../../services/api'
import { downloadApiFile, formatDate, getLevelLabel, getStatusInfo } from '../../utils/sopUtils'
import { Spinner } from '../../shared/components/Loaders'
import Modal from '../../shared/components/Modal'
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle,
  Download, FileText, Calendar, Tag,
  Eye
} from 'lucide-react'
import toast from 'react-hot-toast'

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fileName(doc) {
  return doc ? doc.split(/[\\/]/).pop() : '—'
}

function textOrDash(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return '—'
}
export default function AdminSopTrackingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const passedSop = location.state?.sop

  const [sop, setSop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionOpen, setAction] = useState(false)
  const [downloading, setDl] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)

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
  const sopTitle = sop?.SopTitle ?? sop?.sopTitle ?? passedSop?.sopTitle ?? 'â€”'
  const expiryDate = sop?.ExpirationDate ?? sop?.expirationDate ?? passedSop?.expirationDate
  const approvalLevel = sop?.ApprovalLevel ?? sop?.approvalLevel ?? passedSop?.approvalLevel ?? 0
  const approvalStatus = sop?.ApprovalStatus ?? sop?.approvalStatus ?? passedSop?.status ?? 0
  const sopDocument = sop?.SopDocument ?? sop?.sopDocument ?? passedSop?.sopDocument

  const comments = useMemo(() => {
    const list =
      sop?.sopDetailHistoryResponseList ??
      sop?.SopDetailHistoryResponseList ??
      sop?.sopDetailHistoryList ??
      sop?.SopDetailHistoryList ??
      sop?.sopCommentsResponseList ??
      sop?.SopCommentsResponseList ??
      sop?.sopCommentsList ??
      sop?.SopCommentsList ??
      []

    if (!Array.isArray(list)) return []

    const getCreated = (c) => c?.created ?? c?.Created ?? null
    return [...list].sort((a, b) => new Date(getCreated(b) ?? 0) - new Date(getCreated(a) ?? 0))
  }, [sop])


  // ApprovalStatus 3 = Completed â†’ allow download
  const isCompleted = approvalStatus === 3
  const statusInfo = getStatusInfo(approvalStatus)

  const handleDownload = async () => {
    if (!sopDocument) {
      toast.error('No document attached')
      return
    }

    const baseUrl = import.meta.env.VITE_API_URL

    const fileName = sopDocument.split(/[\\/]/).pop()
    const version =
      sop?.SopDocumentVersion ??
      sop?.sopDocumentVersion ??
      1

    const url = `${baseUrl}/Uploads/Sop-Detail/${id}/SopDocument/V${version}/${fileName}`

    try {
      const response = await fetch(url)
      const blob = await response.blob()

      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()

    } catch {
      toast.error('Download failed')
    }
  }

  const handleHistoryDownload = async (docName, version, rowIndex) => {
    const baseUrl = import.meta.env.VITE_API_URL
    const url = `${baseUrl}/${docName}`
    window.open(url);
  }

  return (
    <div className="min-h-screen p-6 surface space-y-6">

      {/*  Header  */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">

          <div>
            <h1 className="page-title">SOP Details</h1>
            <p className="text-gray-500 text-sm mt-0.5">Review and take action on this SOP</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">

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

      {/*  SOP Detail Card  */}
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
              <p className={`text-sm font-semibold mt-0.5 ${expiryDate && new Date(expiryDate) < new Date()
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
      {/* ── Comments ── */}
      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <h3 className="text-sm font-bold text-gray-900">Sop Change History</h3>
        </div>

        {comments.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-400">No comments found for this SOP.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-[16%]">SOP Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-[18%]">Document</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-[24%]">Comment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-[8%]">Version</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-[14%]">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-[14%]">Date</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-[6%]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comments.map((c, idx) => {
                  const rowDocument = c.sopDocument ?? c.SopDocument ?? sopDocument
                  const rowFileName = fileName(rowDocument)

                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">
                        <span className="block truncate" title={textOrDash(c.sopTitle, c.SopTitle, sopTitle)}>
                          {textOrDash(c.sopTitle, c.SopTitle, sopTitle)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <span className="block truncate" title={rowFileName}>
                          {rowFileName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 break-words align-top">
                        {textOrDash(c.commentText, c.CommentText, c.comments, c.Comments)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap align-top">
                        {textOrDash(c.version, c.Version)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="block truncate" title={textOrDash(c.createdBy, c.CreatedBy)}>
                          {textOrDash(c.createdBy, c.CreatedBy)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap align-top">
                        {formatDateTime(c.created ?? c.Created)}
                      </td>
                      <td className="px-4 py-3 text-center align-top">
                        <button
                          type="button"
                          onClick={() => handleHistoryDownload(rowDocument, c.version, idx)}
                          disabled={downloadingId === idx}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Download document"
                        >
                          {downloadingId === idx ? <Spinner size="sm" /> : <Eye size={14} />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/*  Action Modal  */}
      <SopActionModal
        open={actionOpen}
        onClose={() => setAction(false)}
        sop={{ id, sopTitle, approvalLevel, sopDocument, expirationDate: expiryDate, nextApprovalLevel: (sop?.NextApprovalLevel ?? sop?.nextApprovalLevel ?? passedSop?.nextApprovalLevel ?? 0) }}
        onDone={load}
      />
    </div>
  )
}

// ── Approve / Reject Modal ──
function SopActionModal({ open, onClose, sop, onDone }) {
  const [action, setAction] = useState('approve')
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)

  const approvalLevelNum = Number(sop?.approvalLevel ?? sop?.ApprovalLevel ?? 0) || 0
  const canReject = approvalLevelNum > 0
  const nextApprovalLevel = sop?.nextApprovalLevel ?? sop?.NextApprovalLevel ?? 0

  const expirationDateRaw = sop?.expirationDate ?? sop?.ExpirationDate ?? null
  const isExpired = expirationDateRaw ? new Date(expirationDateRaw) < new Date() : false

  useEffect(() => {
    if (!open) return
    setAction('approve')
    setComments('')
  }, [open, sop?.id])

  const isApprove = action === 'approve'

  const docName = sop?.sopDocument ? sop.sopDocument.split(/[\\/]/).pop() : null
  const title = sop?.sopTitle ? (docName ? (sop.sopTitle + ' (' + docName + ')') : sop.sopTitle) : 'SOP Action'

  const submitAction = async (selectedAction) => {
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
      onDone?.()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.Message || 'Action failed')
    } finally {
      setSaving(false)
    }
  }

  if (!sop) return null

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        {isExpired && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">This SOP is expired. Approve/Reject is not applicable.</p>
          </div>
        )}

        {!isExpired && !isApprove && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl p-3">
            <AlertCircle size={15} className="text-red-600 mt-0.5 shrink-0" />
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
            onChange={(e) => setComments(e.target.value)}
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
                onClick={() => { setAction('approve'); submitAction('approve') }}
                disabled={saving}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 bg-emerald-600 text-white border-emerald-600 shadow-sm hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                <CheckCircle size={15} /> {saving && action === "approve" ? "Approving..." : "Approve"}
              </button>

              {canReject && (
                <button
                  type="button"
                  onClick={() => { setAction('reject'); submitAction('reject') }}
                  disabled={saving}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 bg-red-600 text-white border-red-600 shadow-sm hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  <XCircle size={15} /> {saving && action === "reject" ? "Rejecting..." : "Reject"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}









