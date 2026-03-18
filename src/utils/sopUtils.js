/**
 * Backend Enums (from TecLogos.SOP.EnumsAndConstants/Enums.cs)
 *
 * SopApprovalStatus:  0=Pending  1=Approved  2=Rejected  3=Completed  4=Expired  5=ReturnedForChanges
 * SopApprovalLevel:   0=NotStarted  1=InProgress  2=Submitted
 *                     3=Level1Approval  4=Level2Approval  5=Level3Approval
 *
 * Backend SopDetailResponse fields:
 *   ID, SopTitle, ExpirationDate, SopDocument, SopDocumentVersion,
 *   Remark, ApprovalLevel (0-5), ApprovalStatus (0-4), CreatedByEmail, Created
 */

// ApprovalStatus badge colors
export const SOP_APPROVAL_STATUS = {
  0: { label: 'Pending',   color: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
  1: { label: 'Approved',  color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  2: { label: 'Rejected',  color: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
  3: { label: 'Completed', color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  4: { label: 'Expired',   color: 'bg-gray-100 text-gray-500',     dot: 'bg-gray-400' },
  5: { label: 'Needs Changes', color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
}

// ApprovalLevel display labels
export const SOP_APPROVAL_LEVEL = {
  0: 'Not Started',
  1: 'In Progress',
  2: 'Submitted',
  3: 'Level 1 Approval',
  4: 'Level 2 Approval',
  5: 'Level 3 Approval',
}

/**
 * getStatusInfo(approvalStatus)
 * Used by StatusBadge — maps backend ApprovalStatus (0-4) to display info
 */
export function getStatusInfo(approvalStatus) {
  return SOP_APPROVAL_STATUS[approvalStatus] ?? {
    label: 'Unknown',
    color: 'bg-gray-100 text-gray-500',
    dot:   'bg-gray-400',
  }
}

/**
 * getLevelLabel(approvalLevel)
 * Maps backend ApprovalLevel (0-5) to readable string
 */
export function getLevelLabel(approvalLevel) {
  return SOP_APPROVAL_LEVEL[approvalLevel] ?? `Level ${approvalLevel}`
}

/**
 * formatDate(dateStr)
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/**
 * isExpired(dateStr)
 */
export function isExpired(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

/**
 * downloadBlob(blob, filename)
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * normalizeSopList(data)
 * The backend wraps list responses in { success, data: { TotalCount, Items: [...] } }
 * This helper safely unwraps to just the items array.
 */
/**
 * safeItems(response)
 * Safely extracts an array from any nesting depth of axios response.data
 * Works for all backend shapes:
 *   { success, data: { TotalCount, Items: [...] } }
 *   { success, Data: { TotalCount, Items: [...] } }
 *   { success, data: [...] }
 *   [...]
 */
export function safeItems(responseData) {
  if (!responseData) return []
  // Walk: .data or .Data  →  .Items or .items  →  or the value itself
  const level1 = responseData?.data ?? responseData?.Data ?? responseData
  if (Array.isArray(level1?.Items)) return level1.Items
  if (Array.isArray(level1?.items)) return level1.items
  if (Array.isArray(level1))        return level1
  return []
}

export function normalizeSopList(data) {
  return safeItems(data)
}

/**
 * normalizeSopItem(item)
 * Maps backend SopDetailResponse field names to frontend-friendly lowercase keys.
 *
 * Backend:  ID, SopTitle, ExpirationDate, SopDocumentVersion, ApprovalLevel, ApprovalStatus, CreatedByEmail, Created
 * Frontend: id, sopTitle, expirationDate, documentVersion,    approvalLevel, status,         createdByEmail, created
 */
export function normalizeSopItem(item) {
  if (!item) return item
  const rawStatus = item.ApprovalStatus ?? item.approvalStatus ?? item.status ?? item.Status ?? 0
  const statusNum = typeof rawStatus === 'string' ? Number(rawStatus) : rawStatus
  return {
    id:               item.ID               ?? item.id,
    sopTitle:         item.SopTitle         ?? item.sopTitle,
    expirationDate:   item.ExpirationDate   ?? item.expirationDate,
    sopDocument:      item.SopDocument      ?? item.sopDocument,
    documentVersion:  item.SopDocumentVersion ?? item.documentVersion ?? 1,
    remark:           item.Remark           ?? item.remark,
    approvalLevel:    item.ApprovalLevel    ?? item.approvalLevel ?? 0,
    // map ApprovalStatus → status so existing components work unchanged
    status:           Number.isFinite(statusNum) ? statusNum : 0,
    approvalStatusLabel: item.ApprovalStatusLabel ?? item.approvalStatusLabel,
    createdByEmail:   item.CreatedByEmail   ?? item.createdByEmail,
    created:          item.Created          ?? item.created,
    // keep originals too
    ...item,
  }
}
