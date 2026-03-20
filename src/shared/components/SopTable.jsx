import { formatDate } from '../../utils/sopUtils'
import StatusBadge from './StatusBadge'
import { Eye, FileText, Download, Pencil, Trash2 } from 'lucide-react'

export default function SopTable({ sops = [], loading, actions = {}, emptyMessage = 'No SOPs found' }) {
  if (loading) return (
    <div className="p-4 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-200 rounded-xl animate-pulse" />
      ))}
    </div>
  )

  if (!sops.length) return (
    <div className="py-16 text-center">
      <p className="text-gray-400 text-sm">{emptyMessage}</p>
    </div>
  )

  function getStageAndStatus(sop) {
    if (sop.status == 3) {
      return ('Completed')
    }
    else if (sop.status == 4) {
      return ('Expired')
    } else if (sop.approvalLevel == 0) {
      return ('Pending')
    }
    else {
      return('In Progress')
    }
    
  }


  const levelLabel = (l) =>
    ['Not Started', 'In Progress', 'Submitted', 'L1 Approval', 'L2 Approval', 'L3 Approval'][l] ?? `L${l}`

  const fileName = (doc) => doc ? doc.split(/[\\/]/).pop() : null

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto border-collapse text-sm text-gray-700 min-w-[820px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="table-th">#</th>
            <th className="table-th-left">SOP Title</th>
            <th className="table-th-left">Document</th>
            <th className="table-th">Status</th>
            <th className="table-th">Current Stage</th>
            <th className="table-th">Next Stage</th>
            {/* <th className="table-th">Status</th> */}
            <th className="table-th">Expiry</th>
            {/* <th className="table-th">Created</th> */}
            <th className="table-th">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-gray-50 divide-y divide-gray-200">
          {sops.map((sop, idx) => {
            // ApprovalStatus 3 = Completed → show download
            const isCompleted = sop.status === 3

            return (
              <tr key={sop.id} className="hover:bg-white transition-colors group">
                <td className="table-td text-gray-400">{idx + 1}</td>

                <td className="table-td-left">
                  <div>
                    <span className="font-medium text-gray-900 group-hover:text-slate-700 transition-colors">
                      {sop.sopTitle}
                    </span>
                    {sop.createdByEmail && (
                      <p className="text-xs text-gray-400 mt-0.5">{sop.createdByEmail}</p>
                    )}
                  </div>
                </td>

                <td className="table-td-left">
                  {fileName(sop.sopDocument) ? (
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <FileText size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate max-w-[160px]" title={sop.sopDocument}>
                        {fileName(sop.sopDocument)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>

                <td className="table-td">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    {getStageAndStatus(sop)}
                  </span>
                </td>
                <td className="table-td">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    {sop.stageName}
                  </span>

                </td> <td className="table-td">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    {sop.nextStageName}
                  </span>
                </td>
                {/* <td className="table-td">
                  <StatusBadge status={sop.status} />
                </td> */}

                <td className="table-td">
                  <span className={
                    sop.expirationDate && new Date(sop.expirationDate) < new Date()
                      ? 'text-red-500 font-medium'
                      : 'text-gray-600'
                  }>
                    {formatDate(sop.expirationDate)}
                  </span>
                </td>

                {/* <td className="table-td text-gray-500">{formatDate(sop.created)}</td> */}

                <td className="table-td">
                  <div className="flex items-center justify-center gap-1">

                    {/* Download — only when completed (status=3) */}
                    {isCompleted && actions.onDownload && sop.sopDocument && (
                      <button
                        onClick={() => actions.onDownload(sop)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Download PDF"
                      >
                        <Download size={14} />
                      </button>
                    )}

                    {actions.onViewDetails && (
                      <button
                        onClick={() => actions.onViewDetails(sop)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                    )}

                    {actions.onEdit && (
                      <button
                        onClick={() => actions.onEdit(sop)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Edit SOP"
                      >
                        <Pencil size={14} />
                      </button>
                    )}

                    {actions.onDelete && (
                      <button
                        onClick={() => actions.onDelete(sop)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete SOP"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
