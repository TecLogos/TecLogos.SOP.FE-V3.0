import { useEffect, useState } from 'react'
import { groupAPI, egDetailAPI, ddlAPI } from '../../services/api'
import Modal from '../../shared/components/Modal'
import ConfirmDialog from '../../shared/components/ConfirmDialog'
import { Spinner, EmptyState } from '../../shared/components/Loaders'
import { Plus, Pencil, Trash2, Users, UserPlus, X, RefreshCw, Info } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Group Members sub-panel ───────────────────────────────────────────────
function GroupMembersModal({ group, open, onClose }) {
  const [members, setMembers]       = useState([])
  const [allEmployees, setAllEmps]  = useState([])
  const [loading, setLoading]       = useState(false)
  const [adding, setAdding]         = useState(false)
  const [selectedEmp, setSelected]  = useState('')
  const [removeTarget, setRemove]   = useState(null)

  useEffect(() => {
    if (!open || !group) return
    loadMembers()
    ddlAPI.employees().then(r => setAllEmps(r.data || [])).catch(() => {})
  }, [open, group])

  const loadMembers = async () => {
    setLoading(true)
    try {
      const { data } = await egDetailAPI.getAll()
      const list = Array.isArray(data) ? data : (data.data || [])
      setMembers(list.filter(m => (m.EmployeeGroupID ?? m.employeeGroupID) === group.id))
    } catch { toast.error('Failed to load members') }
    finally { setLoading(false) }
  }

  const handleAdd = async () => {
    if (!selectedEmp) return toast.error('Select an employee first')
    if (members.some(m => m.employeeID === selectedEmp)) return toast.error('Employee already in this group')
    setAdding(true)
    try {
      await egDetailAPI.addMember({ employeeGroupID: group.id, employeeID: selectedEmp })
      toast.success('Employee added to group'); setSelected(''); loadMembers()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add member') }
    finally { setAdding(false) }
  }

  const handleRemove = async (member) => {
    try { await egDetailAPI.removeMember(member.id); toast.success('Employee removed'); loadMembers() }
    catch { toast.error('Failed to remove member') }
    setRemove(null)
  }

  const memberIds = new Set(members.map(m => m.employeeID))
  const available = allEmployees.filter(e => !memberIds.has(e.id))

  return (
    <Modal open={open} onClose={onClose} title={`${group?.name} — Members`} size="lg">
      <div className="space-y-4">
        {/* Add row */}
        <div className="flex gap-2">
          <select className="input flex-1 bg-white" value={selectedEmp} onChange={e => setSelected(e.target.value)}>
            <option value="">— Select employee to add —</option>
            {available.map(e => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.email})</option>
            ))}
          </select>
          <button onClick={handleAdd} disabled={adding || !selectedEmp} className="btn-primary shrink-0">
            {adding ? <Spinner size="sm" /> : <UserPlus size={14} />} Add
          </button>
        </div>

        {/* Members table */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : !members.length ? (
          <EmptyState title="No members yet" desc="Add employees using the selector above" />
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th-left">Employee</th>
                  <th className="table-th">Email</th>
                  <th className="table-th">Remove</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {members.map((member, idx) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td text-gray-400">{idx + 1}</td>
                    <td className="table-td-left">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-slate-700 text-xs font-bold shrink-0">
                          {member.employeeName?.[0] || '?'}
                        </div>
                        <span className="font-medium text-gray-900">{member.employeeName || '—'}</span>
                      </div>
                    </td>
                    <td className="table-td text-gray-500">{member.email || '—'}</td>
                    <td className="table-td">
                      <button onClick={() => setRemove(member)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors mx-auto block">
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog open={!!removeTarget} onClose={() => setRemove(null)}
        onConfirm={() => handleRemove(removeTarget)} title="Remove Member"
        message={`Remove ${removeTarget?.employeeName} from ${group?.name}?`} danger />
    </Modal>
  )
}

// ── Main Groups Page ──────────────────────────────────────────────────────
export default function AdminGroupsPage() {
  const [groups, setGroups]         = useState([])
  const [loading, setLoading]       = useState(false)
  const [formOpen, setFormOpen]     = useState(false)
  const [membersTarget, setMembers] = useState(null)
  const [editGroup, setEdit]        = useState(null)
  const [delTarget, setDel]         = useState(null)
  const [name, setName]             = useState('')
  const [saving, setSaving]         = useState(false)

  const load = async () => {
    setLoading(true)
    try { const { data } = await groupAPI.getAll(); setGroups(data || []) }
    catch { toast.error('Failed to load groups') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openForm = (group = null) => { setEdit(group); setName(group?.name || ''); setFormOpen(true) }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editGroup) await groupAPI.update({ id: editGroup.id, name })
      else           await groupAPI.create({ name })
      toast.success(`Group ${editGroup ? 'updated' : 'created'}`)
      load(); setFormOpen(false)
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await groupAPI.delete(delTarget.id); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Employee Groups</h1>
          <p className="text-gray-500 text-sm mt-1">Manage groups used in workflow stages</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openForm()} className="btn-primary">
            <Plus size={15} /> Create Group
          </button>
          <button onClick={load}
            className="p-2 rounded-md border-2 border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : !groups.length ? (
          <EmptyState title="No groups yet" desc="Create your first employee group" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse text-sm text-gray-700 min-w-[500px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th-left">Group Name</th>
                  <th className="table-th">Members</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-50 divide-y divide-gray-200">
                {groups.map((group, idx) => (
                  <tr key={group.id} className="hover:bg-white transition-colors">
                    <td className="table-td text-gray-400">{idx + 1}</td>
                    <td className="table-td-left">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center shrink-0">
                          <Users size={15} className="text-slate-600" />
                        </div>
                        <span className="font-medium text-gray-900">{group.name}</span>
                      </div>
                    </td>
                    <td className="table-td">
                      <button onClick={() => setMembers(group)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border border-blue-200 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                        <Info size={12} /> View Members
                      </button>
                    </td>
                    <td className="table-td">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openForm(group)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDel(group)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)}
        title={editGroup ? 'Edit Group' : 'New Group'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Group Name *</label>
            <input className="input" required value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Operations Team" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving && <Spinner size="sm" />} Save
            </button>
          </div>
        </form>
      </Modal>

      <GroupMembersModal group={membersTarget} open={!!membersTarget} onClose={() => setMembers(null)} />

      <ConfirmDialog open={!!delTarget} onClose={() => setDel(null)} onConfirm={handleDelete}
        title="Delete Group" message={`Delete group "${delTarget?.name}"? This will remove all its members.`} danger />
    </div>
  )
}
