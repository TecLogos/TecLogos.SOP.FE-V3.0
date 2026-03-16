import { useEffect, useState } from 'react'
import { groupAPI, egDetailAPI, ddlAPI } from '../../services/api'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { Spinner, EmptyState } from '../../components/common/Loaders'
import { Plus, Pencil, Trash2, Users, UserPlus, X } from 'lucide-react'
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
    ddlAPI.employees()
      .then(r => setAllEmps(r.data || []))
      .catch(() => {})
  }, [open, group])

  const loadMembers = async () => {
    setLoading(true)
    try {
      const { data } = await egDetailAPI.getAll()
      const list = Array.isArray(data) ? data : (data.data || [])
      setMembers(list.filter(m => m.employeeGroupID === group.id))
    } catch { toast.error('Failed to load members') }
    finally { setLoading(false) }
  }

  const handleAdd = async () => {
    if (!selectedEmp) return toast.error('Select an employee first')
    const alreadyIn = members.some(m => m.employeeID === selectedEmp)
    if (alreadyIn) return toast.error('Employee already in this group')
    setAdding(true)
    try {
      await egDetailAPI.addMember({ employeeGroupID: group.id, employeeID: selectedEmp })
      toast.success('Employee added to group')
      setSelected('')
      loadMembers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member')
    } finally { setAdding(false) }
  }

  const handleRemove = async (member) => {
    try {
      await egDetailAPI.removeMember(member.id)
      toast.success('Employee removed from group')
      loadMembers()
    } catch { toast.error('Failed to remove member') }
    setRemove(null)
  }

  // Filter out employees already in this group from dropdown
  const memberIds = new Set(members.map(m => m.employeeID))
  const available = allEmployees.filter(e => !memberIds.has(e.id))

  return (
    <Modal open={open} onClose={onClose} title={`${group?.name} — Members`} size="lg">
      <div className="space-y-4">
        {/* Add member row */}
        <div className="flex gap-2">
          <select className="input flex-1 bg-white" value={selectedEmp}
            onChange={e => setSelected(e.target.value)}>
            <option value="">— Select employee to add —</option>
            {available.map(e => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName} ({e.email})
              </option>
            ))}
          </select>
          <button onClick={handleAdd} disabled={adding || !selectedEmp}
            className="btn-primary shrink-0">
            {adding ? <Spinner size="sm" /> : <UserPlus size={14} />}
            Add
          </button>
        </div>

        {/* Members list */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-surface-100 rounded-xl animate-pulse" />)}
          </div>
        ) : !members.length ? (
          <EmptyState title="No members yet" desc="Add employees to this group using the selector above" />
        ) : (
          <div className="border border-surface-200 rounded-xl overflow-hidden">
            <div className="bg-surface-50 px-4 py-2 text-xs font-semibold text-surface-500 uppercase tracking-wide">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </div>
            <div className="divide-y divide-surface-100">
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-50">
                  <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
                    {member.employeeName?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800">{member.employeeName || '—'}</p>
                    <p className="text-xs text-surface-400">{member.email || '—'}</p>
                  </div>
                  <button onClick={() => setRemove(member)}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!removeTarget} onClose={() => setRemove(null)}
        onConfirm={() => handleRemove(removeTarget)}
        title="Remove Member"
        message={`Remove ${removeTarget?.employeeName} from ${group?.name}?`}
        danger
      />
    </Modal>
  )
}

// ── Main Groups Page ──────────────────────────────────────────────────────
export default function AdminGroupsPage() {
  const [groups, setGroups]       = useState([])
  const [loading, setLoading]     = useState(false)
  const [formOpen, setFormOpen]   = useState(false)
  const [membersTarget, setMembers] = useState(null)
  const [editGroup, setEdit]      = useState(null)
  const [delTarget, setDel]       = useState(null)
  const [name, setName]           = useState('')
  const [saving, setSaving]       = useState(false)

  const load = async () => {
    setLoading(true)
    try { const { data } = await groupAPI.getAll(); setGroups(data || []) }
    catch { toast.error('Failed to load groups') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openForm = (group = null) => {
    setEdit(group)
    setName(group?.name || '')
    setFormOpen(true)
  }

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Employee Groups</h1>
          <p className="text-sm text-surface-500 mt-1">Manage groups used in workflow stages</p>
        </div>
        <button onClick={() => openForm()} className="btn-primary">
          <Plus size={14} /> New Group
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />)}
          </div>
        ) : !groups.length ? (
          <EmptyState title="No groups yet" desc="Create your first employee group" />
        ) : (
          <div className="divide-y divide-surface-100">
            {groups.map(group => (
              <div key={group.id}
                className="flex items-center gap-3 px-5 py-4 hover:bg-surface-50 transition-colors">
                <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
                  <Users size={16} className="text-brand-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-surface-800">{group.name}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setMembers(group)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors flex items-center gap-1.5">
                    <Users size={12} /> Members
                  </button>
                  <button onClick={() => openForm(group)}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDel(group)}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)}
        title={editGroup ? 'Edit Group' : 'New Group'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Group Name *</label>
            <input className="input" required value={name}
              onChange={e => setName(e.target.value)}
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

      {/* Members modal */}
      <GroupMembersModal
        group={membersTarget} open={!!membersTarget}
        onClose={() => setMembers(null)} />

      <ConfirmDialog open={!!delTarget} onClose={() => setDel(null)}
        onConfirm={handleDelete} title="Delete Group"
        message={`Delete group "${delTarget?.name}"? This will remove all its members.`} danger />
    </div>
  )
}
