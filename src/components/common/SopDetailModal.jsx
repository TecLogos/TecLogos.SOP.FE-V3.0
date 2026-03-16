import { useEffect, useState } from 'react'
import Modal from './Modal'
import StatusBadge from './StatusBadge'
import { sopAPI } from '../../services/api'
import { formatDate } from '../../utils/sopUtils'
import { PageLoader } from './Loaders'
import { History, CheckCircle2, XCircle, Clock, Download } from 'lucide-react'
import toast from 'react-hot-toast'

const APPROVAL_STATUS = { 0: 'Pending', 1: 'Approved', 2: 'Rejected', 3: 'Needs Changes' }
const APPROVAL_COLOR  = {
  0: 'text-amber-600', 1: 'text-emerald-600', 2: 'text-red-600', 3: 'text-blue-600'
}

export default function SopDetailModal({ sopId, open, onClose }) {
  const [sop, setSop]         = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !sopId) return
    setLoading(true)
    sopAPI.getById(sopId)
      .then(r => setSop(r.data.data))
      .catch(() => toast.error('Failed to load SOP details'))
      .finally(() => setLoading(false))
  }, [open, sopId])

  const handleDownload = async () => {
    try {
      const res = await sopAPI.download(sopId)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url
      a.download = `SOP_${sopId}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Download failed') }
  }

  return (
    <Modal open={open} onClose={onClose} title="SOP Details" size="xl">
      {loading ? <PageLoader /> : sop ? (
        <div className="space-y-6">
          {/* Header info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Title',   value: sop.sopTitle },
              { label: 'Status',  value: <StatusBadge status={sop.status} /> },
              { label: 'Version', value: <span className="font-mono text-xs bg-surface-100 px-2 py-0.5 rounded">v{sop.documentVersion}</span> },
              { label: 'Expiry',  value: formatDate(sop.expirationDate) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-50 rounded-xl p-3">
                <p className="text-xs text-surface-500 font-medium mb-1">{label}</p>
                <div className="text-sm font-semibold text-surface-800">{value}</div>
              </div>
            ))}
          </div>

          {sop.remark && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">Remarks</p>
              <p className="text-sm text-blue-800">{sop.remark}</p>
            </div>
          )}

          {/* Download if completed */}
          {sop.status === 7 && (
            <button onClick={handleDownload} className="btn-success w-full justify-center">
              <Download size={15} /> Download PDF
            </button>
          )}

          {/* Approval history */}
          {sop.approvalHistory?.length > 0 && (
            <div>
              <h3 className="section-title flex items-center gap-2 mb-3">
                <CheckCircle2 size={16} className="text-brand-600" /> Approval History
              </h3>
              <div className="space-y-2">
                {sop.approvalHistory.map(ah => (
                  <div key={ah.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-surface-100 bg-surface-50">
                    <div className="mt-0.5">
                      {ah.approvalStatus === 1 ? <CheckCircle2 size={15} className="text-emerald-500" />
                       : ah.approvalStatus === 2 ? <XCircle size={15} className="text-red-500" />
                       : <Clock size={15} className="text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold ${APPROVAL_COLOR[ah.approvalStatus]}`}>
                          {APPROVAL_STATUS[ah.approvalStatus]}
                        </span>
                        <span className="badge bg-surface-200 text-surface-600">Level {ah.approvalLevel}</span>
                        <span className="text-xs text-surface-400 ml-auto">{formatDate(ah.actionDate)}</span>
                      </div>
                      {ah.remarks && <p className="text-xs text-surface-600 mt-1">{ah.remarks}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Version history */}
          {sop.versionHistory?.length > 0 && (
            <div>
              <h3 className="section-title flex items-center gap-2 mb-3">
                <History size={16} className="text-brand-600" /> Version History
              </h3>
              <div className="space-y-2">
                {sop.versionHistory.map(vh => (
                  <div key={vh.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-surface-100 bg-surface-50 text-sm">
                    <StatusBadge status={vh.status} />
                    <span className="text-surface-600 flex-1 truncate">{vh.remarks || '—'}</span>
                    <span className="text-xs text-surface-400 shrink-0">{formatDate(vh.created)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  )
}
