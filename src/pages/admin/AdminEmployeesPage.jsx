import { useEffect, useState } from 'react'
import { employeeAPI, rolesAPI, onboardingAPI } from '../../services/api'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { Spinner, EmptyState } from '../../components/common/Loaders'
import { Plus, Search, Pencil, Trash2, Mail, Phone, Shield, Send } from 'lucide-react'
import toast from 'react-hot-toast'

function EmployeeForm({ open, onClose, edit, roles, onSaved }) {
  const blank = { firstName: '', middleName: '', lastName: '', email: '', mobileNumber: '', roleID: '' }
  const [form, setForm]     = useState(blank)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(edit ? {
      firstName: edit.firstName || '', middleName: edit.middleName || '',
      lastName: edit.lastName || '', email: edit.email || '',
      mobileNumber: edit.mobileNumber || '', roleID: edit.roleID || '',
    } : blank)
  }, [edit, open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (edit) {
        await employeeAPI.update(edit.id, { ...form, id: edit.id })
        toast.success('Employee updated')
      } else {
        await employeeAPI.create(form)
        toast.success('Employee created — onboarding email sent')
      }
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'Edit Employee' : 'New Employee'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First Name *</label>
            <input className="input" required value={form.firstName}
              onChange={e => set('firstName', e.target.value)} />
          </div>
          <div>
            <label className="label">Last Name *</label>
            <input className="input" required value={form.lastName}
              onChange={e => set('lastName', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Middle Name</label>
          <input className="input" value={form.middleName}
            onChange={e => set('middleName', e.target.value)} />
        </div>
        <div>
          <label className="label">Email *</label>
          <input type="email" className="input" required value={form.email}
            onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className="label">Mobile Number *</label>
          <input className="input" required value={form.mobileNumber}
            onChange={e => set('mobileNumber', e.target.value)} />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input bg-white" value={form.roleID}
            onChange={e => set('roleID', e.target.value)}>
            <option value="">— Select Role —</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving && <Spinner size="sm" />}
            {saving ? 'Saving…' : edit ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [total, setTotal]         = useState(0)
  const [roles, setRoles]         = useState([])
  const [roleMap, setRoleMap]     = useState({}) // id → name
  const [empRoles, setEmpRoles]   = useState({}) // employeeId → roleName
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [formOpen, setFormOpen]   = useState(false)
  const [editEmp, setEdit]        = useState(null)
  const [deleteTarget, setDel]    = useState(null)

  // Load roles once for the map and form dropdown
  useEffect(() => {
    rolesAPI.getAll()
      .then(r => {
        const list = r.data || []
        setRoles(list)
        const map = {}
        list.forEach(role => { map[role.id] = role.name })
        setRoleMap(map)
      })
      .catch(() => {})
  }, [])

  // Load employee roles list for display
  useEffect(() => {
    employeeAPI.getRoles()
      .then(r => {
        const list = r.data?.data || r.data || []
        const map = {}
        list.forEach(er => { map[er.employeeID] = er.roleName })
        setEmpRoles(map)
      })
      .catch(() => {}) // graceful — role display is optional
  }, [])

  const loadEmployees = async () => {
    setLoading(true)
    try {
      const { data } = await employeeAPI.getAll(page, 20, search || undefined)
      setEmployees(data.data || [])
      setTotal(data.count || 0)
    } catch { toast.error('Failed to load employees') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadEmployees() }, [page, search])

  const handleResendInvite = async (emp) => {
    try {
      await onboardingAPI.resendInvite(emp.id)
      toast.success(`Invite resent to ${emp.email}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend invite')
    }
  }

  const handleSendInvite = async (emp) => {
    try {
      await employeeAPI.sendInvite(emp.id)
      toast.success(`Invitation sent to ${emp.email}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invite')
    }
  }

  const handleDelete = async () => {
    try {
      await employeeAPI.delete(deleteTarget.id)
      toast.success('Employee deleted')
      loadEmployees()
    } catch { toast.error('Delete failed') }
  }

  // Resolve role name: try empRoles lookup first, then roleMap via roleID
  const getRoleName = (emp) => {
    return empRoles[emp.id]
      || empRoles[emp.iD]
      || (emp.roleID && roleMap[emp.roleID])
      || emp.roleName
      || null
  }

  const pages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="text-sm text-surface-500 mt-1">{total} total records</p>
        </div>
        <button onClick={() => { setEdit(null); setFormOpen(true) }} className="btn-primary">
          <Plus size={14} /> New Employee
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input className="input pl-9" placeholder="Search employees…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />)}
          </div>
        ) : !employees.length ? (
          <EmptyState title="No employees yet" desc="Create your first employee to get started" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Name</th>
                    <th className="table-th">Email</th>
                    <th className="table-th">Mobile</th>
                    <th className="table-th">Role</th>
                    <th className="table-th w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => {
                    const roleName = getRoleName(emp)
                    return (
                      <tr key={emp.id} className="hover:bg-surface-50 transition-colors">
                        <td className="table-td">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
                              {emp.firstName?.[0]}{emp.lastName?.[0]}
                            </div>
                            <span className="font-medium text-surface-900">
                              {emp.firstName} {emp.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="table-td">
                          <div className="flex items-center gap-1.5 text-surface-600">
                            <Mail size={12} />{emp.email}
                          </div>
                        </td>
                        <td className="table-td">
                          <div className="flex items-center gap-1.5 text-surface-600">
                            <Phone size={12} />{emp.mobileNumber}
                          </div>
                        </td>
                        <td className="table-td">
                          {roleName ? (
                            <span className="badge bg-brand-50 text-brand-700 flex items-center gap-1 w-fit">
                              <Shield size={10} />{roleName}
                            </span>
                          ) : (
                            <span className="text-surface-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="table-td">
                          <div className="flex gap-1">
                            <button onClick={() => { setEdit(emp); setFormOpen(true) }}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Edit employee">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleResendInvite(emp)}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                              title="Resend onboarding invite">
                              <Send size={14} />
                            </button>
                            <button onClick={() => setDel(emp)}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete employee">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
                <span className="text-xs text-surface-500">Page {page} of {pages} · {total} total</span>
                <div className="flex gap-1">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-surface-200 hover:bg-surface-100 disabled:opacity-40">
                    Prev
                  </button>
                  <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-surface-200 hover:bg-surface-100 disabled:opacity-40">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <EmployeeForm open={formOpen} onClose={() => setFormOpen(false)}
        edit={editEmp} roles={roles} onSaved={loadEmployees} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDel(null)}
        onConfirm={handleDelete} title="Delete Employee"
        message={`Delete ${deleteTarget?.firstName} ${deleteTarget?.lastName}?`} danger />
    </div>
  )
}
