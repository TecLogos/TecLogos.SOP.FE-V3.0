import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { groupAPI, egDetailAPI, ddlAPI } from '../../services/api'
import ConfirmDialog from '../../shared/components/ConfirmDialog'
import { Spinner, EmptyState } from '../../shared/components/Loaders'
import { ArrowLeft, UserPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminGroupFormPage() {
  const { id }   = useParams()
  const isEdit   = !!id
  const navigate = useNavigate()
  const location = useLocation()
  const isView   = location.pathname.includes('/view/')

  const [name, setName]       = useState('')
  const [editMeta, setMeta]   = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving]   = useState(false)

  // Members state
  const [members, setMembers]       = useState([])
  const [allEmployees, setAllEmps]  = useState([])
  const [adding, setAdding]         = useState(false)
  const [selectedEmp, setSelected]  = useState('')
  const [removeTarget, setRemove]   = useState(null)
  const [loadingMembers, setLoadingMembers] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    setLoadingMembers(true)
    
    Promise.all([
      groupAPI.getById(id),
      ddlAPI.employees(),
      egDetailAPI.getAll()
    ])
      .then(([gRes, eRes, mRes]) => {
        const g = gRes.data?.data ?? gRes.data
        setName(g.name || g.Name || '')
        setMeta({ version: g.version ?? g.Version ?? 0 })
        
        setAllEmps(Array.isArray(eRes.data) ? eRes.data : (eRes.data?.data ?? eRes.data?.Data ?? []))
        
        const list = Array.isArray(mRes.data) ? mRes.data : (mRes.data?.data || [])
        setMembers(list.filter(m => (m.EmployeeGroupID ?? m.employeeGroupID) === id))
      })
      .catch(() => toast.error('Failed to load group details'))
      .finally(() => {
        setLoading(false)
        setLoadingMembers(false)
      })
  }, [id, isEdit])

  const loadMembers = async () => {
    try {
      const { data } = await egDetailAPI.getAll()
      const list = Array.isArray(data) ? data : (data.data || [])
      setMembers(list.filter(m => (m.EmployeeGroupID ?? m.employeeGroupID) === id))
    } catch { toast.error('Failed to reload members') }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    if (!selectedEmp) return toast.error('Select an employee first')
    if (members.some(m => m.employeeID === selectedEmp)) return toast.error('Employee already in this group')
    setAdding(true)
    try {
      await egDetailAPI.addMember({ employeeGroupID: id, employeeID: selectedEmp })
      toast.success('Employee added to group')
      setSelected('')
      await loadMembers()
    } catch (err) { 
      toast.error(err.response?.data?.message || err.response?.data?.Message || 'Failed to add member') 
    }
    finally { setAdding(false) }
  }

  const handleRemoveMember = async (member) => {
    try { 
      await egDetailAPI.removeMember(member.id)
      toast.success('Employee removed from group')
      await loadMembers() 
    } catch { 
      toast.error('Failed to remove member') 
    }
    setRemove(null)
  }

  const memberIds = new Set(members.map(m => m.employeeID ?? m.EmployeeID))
  const available = allEmployees.filter(e => !memberIds.has(e.id ?? e.ID ?? e.Id))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit) await groupAPI.update({ id, name, version: editMeta?.version ?? 0 })
      else        await groupAPI.create({ name })
      toast.success(`Group ${isEdit ? 'updated' : 'created'}`)
      navigate('/admin/groups')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
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

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/admin/groups')}
              className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="page-title">{isView ? 'Group Details' : isEdit ? 'Edit Group' : 'New Group'}</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {isView ? 'View employee group details' : isEdit ? 'Update employee group name' : 'Create a new employee group'}
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
                {saving ? 'Saving…' : isEdit ? 'Update Group' : 'Create Group'}
              </button>
            )}
          </div>
        </div>

        {/* Form card */}
        <div className="card-surface border border-gray-200 rounded-2xl shadow-sm p-6">
            <div>
              <label className="label">Group Name *</label>
              <input className="input" required value={name} disabled={isView}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Operations Team" />
            </div>

        </div>
      </form>

      {/* Members Section Card */}
      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Group Members</h2>
          <p className="text-sm text-gray-500">Manage employees in this workflow group.</p>
        </div>

        {!isEdit ? (
          <EmptyState title="Save Group First" desc="You must create the group before you can add members to it." />
        ) : (
          <div className="space-y-6">
            {/* Add Member form */}
            {!isView && (
              <form onSubmit={handleAddMember} className="flex gap-3">
                <select className="input flex-1 bg-white" value={selectedEmp} onChange={e => setSelected(e.target.value)}>
                  <option value="">— Select employee to add —</option>
                  {available.map(e => {
                    const eid = e.id ?? e.ID ?? e.Id
                    const fname = e.firstName ?? e.FirstName ?? ''
                    const lname = e.lastName ?? e.LastName ?? ''
                    const eml = e.email ?? e.Email ?? ''
                    
                    const namePart = (fname || lname) ? `${fname} ${lname}`.trim() : 'Unknown'

                    return (
                      <option key={eid} value={eid}>
                        {namePart} ({eml})
                      </option>
                    )
                  })}
                </select>
                <button type="submit" disabled={adding || !selectedEmp} className="btn-primary shrink-0 px-6">
                  {adding ? <Spinner size="sm" /> : <UserPlus size={16} />}
                  <span className="ml-2">Add Member</span>
                </button>
              </form>
            )}

            {/* Member list */}
            {loadingMembers ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded-xl animate-pulse" />)}
              </div>
            ) : !members.length ? (
              <EmptyState title="No members yet" desc="Add employees using the selector above" />
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-th text-center w-16">#</th>
                      <th className="table-th-left">Employee</th>
                      <th className="table-th-left">Email</th>
                      {!isView && <th className="table-th text-center w-24">Remove</th>}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {members.map((member, idx) => (
                      <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-td text-gray-400 text-center">{idx + 1}</td>
                        <td className="table-td-left">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-700 text-sm font-bold shrink-0">
                              {member.employeeName?.[0] || '?'}
                            </div>
                            <span className="font-medium text-gray-900">{member.employeeName || '—'}</span>
                          </div>
                        </td>
                        <td className="table-td-left text-gray-500">{member.email || '—'}</td>
                        {!isView && (
                          <td className="table-td text-center">
                            <button type="button" onClick={() => setRemove(member)}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors mx-auto block">
                              <X size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog open={!!removeTarget} onClose={() => setRemove(null)}
        onConfirm={() => handleRemoveMember(removeTarget)} title="Remove Member"
        message={`Remove ${removeTarget?.employeeName} from this group?`} danger />
        
    </div>
  )
}
