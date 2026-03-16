import { formatDate } from '../../utils/sopUtils'
import StatusBadge from './StatusBadge'
import { Download, Eye, Pencil, Trash2 } from 'lucide-react'

export default function SopTable({ sops = [], loading, actions = {}, emptyMessage = 'No SOPs found' }) {
  if (loading) return (
    <div className="space-y-3 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 bg-surface-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )

  if (!sops.length) return (
    <div className="py-16 text-center">
      <p className="text-surface-400 text-sm">{emptyMessage}</p>
    </div>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr>
            <th className="table-th">SOP Title</th>
            <th className="table-th">Status</th>
            <th className="table-th">Approval Level</th>
            <th className="table-th">Version</th>
            <th className="table-th">Expiry Date</th>
            <th className="table-th">Created</th>
            <th className="table-th w-28">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sops.map(sop => (
            <tr key={sop.id} className="hover:bg-surface-50 transition-colors group">
              <td className="table-td">
                <span className="font-medium text-surface-900 group-hover:text-brand-600 transition-colors">
                  {sop.sopTitle}
                </span>
              </td>
              <td className="table-td"><StatusBadge status={sop.status} /></td>
              <td className="table-td">
                {sop.currentApprovalLevel > 0
                  ? <span className="badge bg-violet-50 text-violet-700">Level {sop.currentApprovalLevel}</span>
                  : <span className="text-surface-400">—</span>
                }
              </td>
              <td className="table-td">
                <span className="font-mono text-xs bg-surface-100 px-2 py-0.5 rounded">
                  v{sop.documentVersion}
                </span>
              </td>
              <td className="table-td">
                <span className={sop.expirationDate && new Date(sop.expirationDate) < new Date()
                  ? 'text-red-500 font-medium' : ''}>
                  {formatDate(sop.expirationDate)}
                </span>
              </td>
              <td className="table-td text-surface-500">{formatDate(sop.created)}</td>
              <td className="table-td">
                <div className="flex items-center gap-1">
                  {actions.onView && (
                    <button onClick={() => actions.onView(sop)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      title="View">
                      <Eye size={14} />
                    </button>
                  )}
                  {actions.onEdit && (
                    <button onClick={() => actions.onEdit(sop)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Edit">
                      <Pencil size={14} />
                    </button>
                  )}
                  {actions.onDownload && sop.status === 7 && (
                    <button onClick={() => actions.onDownload(sop)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Download PDF">
                      <Download size={14} />
                    </button>
                  )}
                  {actions.onDelete && (
                    <button onClick={() => actions.onDelete(sop)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
