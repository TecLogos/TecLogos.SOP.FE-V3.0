import { memo, useMemo } from 'react'
import { formatDate, isExpired } from '../../utils/sopUtils'
import useVirtualRange from '../hooks/useVirtualRange'
import { Eye, FileText, Download, Pencil, Trash2, Logs } from 'lucide-react'

function fileName(doc) {
  return doc ? doc.split(/[\\/]/).pop() : null
}

function getStageAndStatus(sop) {
  if (sop.status === 3) return 'Completed'
  if (sop.status === 4) return 'Expired'
  if (sop.approvalLevel === 0) return 'Pending'
  return 'In Progress'
}

const SopRow = memo(function SopRow({ sop, idx, actions }) {
  const documentName = fileName(sop.sopDocument)
  const completed = sop.status === 3
  const expired = isExpired(sop.expirationDate)

  return (
    <tr className="hover:bg-white transition-colors group">
      <td className="table-td text-gray-400 whitespace-nowrap">{idx + 1}</td>

      <td className="table-td-left">
        <div className="min-w-0">
          <span className="font-medium text-gray-900 group-hover:text-slate-700 transition-colors">
            {sop.sopTitle}
          </span>
          {sop.createdByEmail && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{sop.createdByEmail}</p>
          )}
        </div>
      </td>

      <td className="table-td-left">
        {documentName ? (
          <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
            <FileText size={13} className="text-gray-400 shrink-0" />
            <span className="truncate max-w-[200px]" title={sop.sopDocument}>
              {documentName}
            </span>
          </div>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>

      <td className="table-td whitespace-nowrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
          {getStageAndStatus(sop)}
        </span>
      </td>

      <td className="table-td whitespace-nowrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
          {sop.stageName || '-'}
        </span>
      </td>

      <td className="table-td whitespace-nowrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
          {sop.nextStageName || '-'}
        </span>
      </td>

      <td className="table-td whitespace-nowrap">
        <span className={expired ? 'text-red-500 font-medium' : 'text-gray-600'}>
          {formatDate(sop.expirationDate)}
        </span>
      </td>

      <td className="table-td whitespace-nowrap">
        <div className="flex items-center justify-center gap-1">
          {completed && actions.onDownload && sop.sopDocument && (
            <button
              type="button"
              onClick={() => actions.onDownload(sop)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Download PDF"
            >
              <Download size={14} />
            </button>
          )}

          {actions.onViewDetails && (
            <button
              type="button"
              onClick={() => actions.onViewDetails(sop)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="View Details"
            >
              <Eye size={14} />
            </button>
          )}

          {actions.onHistory && (
            <button
              type="button"
              onClick={() => actions.onHistory(sop)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
              title="Approval History"
            >
              <Logs size={14} />
            </button>
          )}

          {actions.onEdit && (
            <button
              type="button"
              onClick={() => actions.onEdit(sop)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Edit SOP"
            >
              <Pencil size={14} />
            </button>
          )}

          {actions.onDelete && (
            <button
              type="button"
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
})

export default function SopTable({
  sops = [],
  loading,
  actions = {},
  emptyMessage = 'No SOPs found',
  virtualizeFrom = 250,
  rowHeight = 56,
  maxBodyHeightClass = 'max-h-[60vh]',
}) {
  const shouldVirtualize = sops.length >= virtualizeFrom

  const safeActions = useMemo(() => ({
    onDownload: actions.onDownload,
    onViewDetails: actions.onViewDetails,
    onHistory: actions.onHistory,
    onEdit: actions.onEdit,
    onDelete: actions.onDelete,
  }), [
    actions.onDelete,
    actions.onDownload,
    actions.onEdit,
    actions.onHistory,
    actions.onViewDetails,
  ])

  const { containerRef, startIndex, endIndex, topSpacer, bottomSpacer } = useVirtualRange({
    enabled: shouldVirtualize,
    itemCount: sops.length,
    rowHeight,
  })

  const visibleRows = useMemo(() => (
    shouldVirtualize ? sops.slice(startIndex, endIndex) : sops
  ), [endIndex, shouldVirtualize, sops, startIndex])

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="h-12 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!sops.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-400 text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div ref={containerRef} className={shouldVirtualize ? `overflow-y-auto ${maxBodyHeightClass}` : 'overflow-y-visible'}>
        <table className="w-full table-auto border-collapse text-sm text-gray-700 min-w-[820px]">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="table-th">#</th>
              <th className="table-th-left">SOP Title</th>
              <th className="table-th-left">Document</th>
              <th className="table-th">Status</th>
              <th className="table-th">Current Stage</th>
              <th className="table-th">Next Stage</th>
              <th className="table-th">Expiry</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-gray-50 divide-y divide-gray-200">
            {shouldVirtualize && topSpacer > 0 && (
              <tr aria-hidden>
                <td colSpan={8} style={{ height: topSpacer, padding: 0, border: 0 }} />
              </tr>
            )}

            {visibleRows.map((sop, index) => {
              const realIndex = shouldVirtualize ? startIndex + index : index
              return (
                <SopRow
                  key={sop.id}
                  sop={sop}
                  idx={realIndex}
                  actions={safeActions}
                />
              )
            })}

            {shouldVirtualize && bottomSpacer > 0 && (
              <tr aria-hidden>
                <td colSpan={8} style={{ height: bottomSpacer, padding: 0, border: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
