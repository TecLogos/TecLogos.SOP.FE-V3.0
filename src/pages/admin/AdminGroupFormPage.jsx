import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { groupAPI, egDetailAPI, ddlAPI } from '../../services/api'
import ConfirmDialog from '../../shared/components/ConfirmDialog'
import { Spinner, EmptyState } from '../../shared/components/Loaders'
import { ArrowLeft, UserPlus, X, Search } from 'lucide-react'
import { GrGroup } from "react-icons/gr";
import toast from 'react-hot-toast'

export default function AdminGroupFormPage() {
  const { id }   = useParams()
  const isEdit   = !!id
  const navigate = useNavigate()
  const location = useLocation()
  const isView   = location.pathname.includes('/view/')

  // ── Group name ────────────────────────────────────────────────────────
  const [name, setName]       = useState('')
  const [editMeta, setMeta]   = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving]   = useState(false)

  // ── Employees lists ───────────────────────────────────────────────────
  // allEmployees: full DDL list from backend
  // selectedMembers: staged for CREATE (not yet persisted) or current for EDIT
  const [allEmployees, setAllEmps]       = useState([])
  const [selectedMembers, setSelected]   = useState([]) // for create: pending additions
  const [savedMembers, setSaved]         = useState([]) // for edit: already-in-group
  const [empSearch, setEmpSearch]        = useState('')
  const [loadingEmps, setLoadingEmps]    = useState(true)

  // ── Edit: remove confirmation ─────────────────────────────────────────
  const [removeTarget, setRemove] = useState(null)
  const [removing, setRemoving]   = useState(false)

  // ── Load employees DDL ────────────────────────────────────────────────
  useEffect(() => {
    setLoadingEmps(true)
    ddlAPI.employees()
      .then(r => {
        const list = r.data?.data ?? r.data?.Data ?? r.data
        setAllEmps(Array.isArray(list) ? list : [])
      })
      .catch(() => toast.error('Failed to load employees'))
      .finally(() => setLoadingEmps(false))
  }, [])

  // ── Load existing group data (edit/view) ──────────────────────────────
  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    Promise.all([groupAPI.getById(id), egDetailAPI.getAll()])
      .then(([gRes, mRes]) => {
        const g = gRes.data?.data ?? gRes.data?.Data ?? gRes.data
        setName(g?.name || g?.Name || '')
        setMeta({ version: g?.version ?? g?.Version ?? 0 })

        const all = mRes.data?.data ?? mRes.data?.Data ?? mRes.data
        const list = Array.isArray(all) ? all : []
        setSaved(list.filter(m => (m.EmployeeGroupID ?? m.employeeGroupID) === id))
      })
      .catch(() => toast.error('Failed to load group'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const reloadSaved = async () => {
    const { data } = await egDetailAPI.getAll()
    const list = data?.data ?? data?.Data ?? data
    setSaved((Array.isArray(list) ? list : []).filter(
      m => (m.EmployeeGroupID ?? m.employeeGroupID) === id
    ))
  }

  // ── IDs already in the group (saved + staged) ─────────────────────────
  const savedIds    = new Set(savedMembers.map(m => m.EmployeeID ?? m.employeeID))
  const stagedIds   = new Set(selectedMembers.map(e => e.id ?? e.ID ?? e.Id))
  const takenIds    = new Set([...savedIds, ...stagedIds])

  // ── Employees available to add (not already in group) ─────────────────
  const available = allEmployees.filter(e => {
    const eid = e.id ?? e.ID ?? e.Id ?? ''
    if (takenIds.has(eid)) return false
    if (!empSearch.trim()) return true
    const q  = empSearch.toLowerCase()
    const fn = (e.firstName ?? e.FirstName ?? '').toLowerCase()
    const ln = (e.lastName  ?? e.LastName  ?? '').toLowerCase()
    const em = (e.email     ?? e.Email     ?? '').toLowerCase()
    return fn.includes(q) || ln.includes(q) || em.includes(q)
  })

  const displayName = (e) => {
    const fn = e.firstName ?? e.FirstName ?? ''
    const ln = e.lastName  ?? e.LastName  ?? ''
    const em = e.email     ?? e.Email     ?? ''
    return (fn || ln) ? `${fn} ${ln}`.trim() : em
  }

  // Stage an employee to be added (CREATE mode: local only; EDIT mode: immediate API call)
  const handleStageAdd = async (emp) => {
    const eid = emp.id ?? emp.ID ?? emp.Id
    if (takenIds.has(eid)) return

    if (isEdit) {
      // Immediately add via API
      try {
        await egDetailAPI.addMember({ employeeGroupID: id, employeeID: eid })
        toast.success(`${displayName(emp)} added`)
        await reloadSaved()
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to add member')
      }
    } else {
      // Stage locally for create
      setSelected(prev => [...prev, emp])
    }
    setEmpSearch('')
  }

  // Remove a staged member (CREATE mode only)
  const handleUnstageMember = (emp) => {
    const eid = emp.id ?? emp.ID ?? emp.Id
    setSelected(prev => prev.filter(e => (e.id ?? e.ID ?? e.Id) !== eid))
  }

  // Remove a saved member (EDIT mode, calls API immediately)
  const handleRemoveSaved = async (member) => {
    setRemoving(true)
    try {
      await egDetailAPI.removeMember(member.id ?? member.ID)
      toast.success('Member removed')
      await reloadSaved()
    } catch {
      toast.error('Failed to remove member')
    } finally {
      setRemoving(false)
      setRemove(null)
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Group name is required'); return }
    setSaving(true)
    try {
      if (isEdit) {
        await groupAPI.update({ id, name, version: editMeta?.version ?? 0 })
        toast.success('Group updated')
        navigate('/admin/groups')
      } else {
        // 1. Create group
        const createRes = await groupAPI.create({ name })
        const newId = createRes.data?.data?.id
          ?? createRes.data?.data?.ID
          ?? createRes.data?.id
          ?? createRes.data?.ID

        // 2. Add all staged members in parallel (ignore individual failures)
        if (selectedMembers.length > 0 && newId) {
          await Promise.allSettled(
            selectedMembers.map(emp =>
              egDetailAPI.addMember({
                employeeGroupID: newId,
                employeeID: emp.id ?? emp.ID ?? emp.Id,
              })
            )
          )
        }
        toast.success(
          `Group created${selectedMembers.length > 0 ? ` with ${selectedMembers.length} member${selectedMembers.length > 1 ? 's' : ''}` : ''}`
        )
        navigate('/admin/groups')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.Message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 surface flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Members to display: staged (create) OR saved (edit)
  const displayMembers = isEdit ? savedMembers : selectedMembers

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
          
            <div>
              <h1 className="page-title">
                {isView ? 'Group Details' : isEdit ? 'Edit Group' : 'New Group'}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {isView
                  ? 'View employee group and its members'
                  : isEdit
                    ? 'Update group name and manage members'
                    : 'Create a new group and add members in one step'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/admin/groups')}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors">
              {isView ? 'Back' : 'Cancel'}
            </button>
            {!isView && (
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Spinner size="sm" />}
                {saving
                  ? 'Saving…'
                  : isEdit
                    ? 'Update Group'
                    : selectedMembers.length > 0
                      ? `Create Group & Add ${selectedMembers.length} Member${selectedMembers.length > 1 ? 's' : ''}`
                      : 'Create Group'}
              </button>
            )}
          </div>
        </div>

        {/* ── Group Name ── */}
        <div className="card-surface border border-gray-200 rounded-2xl shadow-sm p-6">
          <label className="label">Group Name *</label>
          <input
            className="input max-w-xl"
            required
            value={name}
            disabled={isView}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Operations Team"
          />
        </div>

        {/* ── Members section ── */}
        <div className="card-surface border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <GrGroup size={16} className="text-slate-600" /> Group Members
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isView
                ? 'Employees in this group'
                : isEdit
                  ? 'Search and add employees; click × to remove'
                  : 'Search and select employees to add — all saved when you click Create Group'}
            </p>
          </div>

          {/* Search + add (not view mode) */}
          {!isView && (
            <div className="space-y-2">
              <div className="relative max-w-xl">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              {/* Dropdown results */}
              {empSearch.trim() && (
                <div className="max-w-xl border border-gray-200 rounded-xl bg-white shadow-lg overflow-hidden max-h-52 overflow-y-auto z-10 relative">
                  {loadingEmps ? (
                    <div className="p-4 flex justify-center"><Spinner size="sm" /></div>
                  ) : available.length === 0 ? (
                    <p className="p-4 text-sm text-gray-400 text-center">
                      {allEmployees.length === 0 ? 'No employees found' : 'All matching employees already added'}
                    </p>
                  ) : (
                    available.map(emp => {
                      const eid = emp.id ?? emp.ID ?? emp.Id
                      const em  = emp.email ?? emp.Email ?? ''
                      return (
                        <button
                          key={eid}
                          type="button"
                          onClick={() => handleStageAdd(emp)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                            {displayName(emp)[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{displayName(emp)}</p>
                            {em && <p className="text-xs text-gray-400">{em}</p>}
                          </div>
                          <UserPlus size={14} className="ml-auto text-gray-300 shrink-0" />
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Member chips / table */}
          {displayMembers.length === 0 ? (
            <EmptyState
              title={isView ? 'No members' : isEdit ? 'No members yet' : 'No members added yet'}
              desc={isView ? '' : isEdit ? 'Use the search above to add employees' : 'Search for employees above to stage them for this group'}
            />
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 flex items-center justify-between">
                <span>{displayMembers.length} member{displayMembers.length !== 1 ? 's' : ''}</span>
                {!isEdit && !isView && (
                  <span className="text-amber-600 font-medium normal-case text-xs">
                    ⚡ Will be added when you save
                  </span>
                )}
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-10">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Email</th>
                    {!isView && <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 w-16">Remove</th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {displayMembers.map((member, idx) => {
                    // Normalise whether coming from DDL (create) or egDetailAPI (edit)
                    const fn  = member.firstName  ?? member.FirstName  ?? member.employeeName ?? ''
                    const ln  = member.lastName   ?? member.LastName   ?? ''
                    const em  = member.email      ?? member.Email      ?? ''
                    const full = (fn || ln) ? `${fn} ${ln}`.trim() : fn || em
                    const init = full[0]?.toUpperCase() || '?'

                    return (
                      <tr key={member.id ?? member.ID ?? idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                              {init}
                            </div>
                            <span className="font-medium text-gray-800">{full || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{em || '—'}</td>
                        {!isView && (
                          <td className="px-4 py-3 text-center">
                            {isEdit ? (
                              <button type="button"
                                onClick={() => setRemove(member)}
                                disabled={removing}
                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors mx-auto block">
                                <X size={15} />
                              </button>
                            ) : (
                              <button type="button"
                                onClick={() => handleUnstageMember(member)}
                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors mx-auto block">
                                <X size={15} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </form>

      {/* Remove confirmation (EDIT mode only) */}
      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemove(null)}
        onConfirm={() => handleRemoveSaved(removeTarget)}
        title="Remove Member"
        message={`Remove this employee from the group?`}
        danger
      />
    </div>
  )
}
