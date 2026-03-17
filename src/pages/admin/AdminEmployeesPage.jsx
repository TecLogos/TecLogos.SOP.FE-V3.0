import { useEffect, useState } from 'react'
import { employeeAPI, rolesAPI, onboardingAPI } from '../../services/api'
import Modal from '../../shared/components/Modal'
import ConfirmDialog from '../../shared/components/ConfirmDialog'
import { Spinner, EmptyState } from '../../shared/components/Loaders'
import { Plus, Search, Pencil, Trash2, Mail, Phone, Shield, Send, RefreshCw, X } from 'lucide-react'
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
      if (edit) { await employeeAPI.update(edit.id, { ...form, id: edit.id }); toast.success('Employee updated') }
      else       { await employeeAPI.create(form); toast.success('Employee created — onboarding email sent') }
      onSaved(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'Edit Employee' : 'New Employee'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First Name *</label>
            <input className="input" required value={form.firstName} onChange={e => set('firstName', e.target.value)} />
          </div>
          <div>
            <label className="label">Last Name *</label>
            <input className="input" required value={form.lastName} onChange={e => set('lastName', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Middle Name</label>
          <input className="input" value={form.middleName} onChange={e => set('middleName', e.target.value)} />
        </div>
        <div>
          <label className="label">Email *</label>
          <input type="email" className="input" required value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className="label">Mobile Number *</label>
          <input className="input" required value={form.mobileNumber} onChange={e => set('mobileNumber', e.target.value)} />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input bg-white" value={form.roleID} onChange={e => set('roleID', e.target.value)}>
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
  const [roleMap, setRoleMap]     = useState({})
  const [empRoles, setEmpRoles]   = useState({})
  const [page, setPage]           = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [formOpen, setFormOpen]   = useState(false)
  const [editEmp, setEdit]        = useState(null)
  const [deleteTarget, setDel]    = useState(null)

  useEffect(() => {
    rolesAPI.getAll()
      .then(r => {
        const list = r.data || []
        setRoles(list)
        const map = {}; list.forEach(role => { map[role.id] = role.name }); setRoleMap(map)
      }).catch(() => {})
  }, [])

  useEffect(() => {
    employeeAPI.getRoles()
      .then(r => {
        const list = r.data?.Data || r.data?.data || r.data || []
        const map = {}; list.forEach(er => { map[er.EmployeeID || er.employeeID] = er.RoleName || er.roleName }); setEmpRoles(map)
      }).catch(() => {})
  }, [])

  const loadEmployees = async () => {
    setLoading(true)
    try {
      const { data } = await employeeAPI.getAll(page, 20, search || undefined)
      setEmployees(data.data || []); setTotal(data.count || 0)
    } catch { toast.error('Failed to load employees') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadEmployees() }, [page, search])

  const handleResendInvite = async (emp) => {
    try { await onboardingAPI.resendInvite(emp.id); toast.success(`Invite resent to ${emp.email}`) }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to resend invite') }
  }

  const handleDelete = async () => {
    try { await employeeAPI.delete(deleteTarget.id); toast.success('Employee deleted'); loadEmployees() }
    catch { toast.error('Delete failed') }
  }

  const getRoleName = (emp) =>
    empRoles[emp.id] || empRoles[emp.iD] || (emp.roleID && roleMap[emp.roleID]) || emp.roleName || null

  const pages = Math.ceil(total / 20)

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total records</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (setSearch(searchInput), setPage(1))}
            placeholder="Search employees…"
            className="w-48 px-2.5 py-1.5 border-2 border-gray-300 hover:border-gray-400 rounded-lg text-sm focus:outline-none focus:border-slate-400 bg-gray-50"
          />
          <button onClick={() => { setSearch(searchInput); setPage(1) }}
            className="p-1.5 rounded-md border-2 border-cyan-200 bg-cyan-50 text-gray-500 hover:bg-cyan-100" title="Search">
            <Search size={16} />
          </button>
          <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
            className="p-1.5 rounded-md border-2 border-red-200 bg-red-50 text-red-500 hover:bg-red-100" title="Clear">
            <X size={16} />
          </button>
          <button onClick={() => { setEdit(null); setFormOpen(true) }} className="btn-primary">
            <Plus size={15} /> New Employee
          </button>
          <button onClick={loadEmployees}
            className="p-2 rounded-md border-2 border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : !employees.length ? (
          <EmptyState title="No employees yet" desc="Create your first employee to get started" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse text-sm text-gray-700 min-w-[700px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">#</th>
                    <th className="table-th-left">Name</th>
                    <th className="table-th">Email</th>
                    <th className="table-th">Mobile</th>
                    <th className="table-th">Role</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-50 divide-y divide-gray-200">
                  {employees.map((emp, idx) => {
                    const roleName = getRoleName(emp)
                    return (
                      <tr key={emp.id} className="hover:bg-white transition-colors">
                        <td className="table-td text-gray-400">{(page - 1) * 20 + idx + 1}</td>
                        <td className="table-td-left">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-700 text-xs font-bold shrink-0">
                              {emp.firstName?.[0]}{emp.lastName?.[0]}
                            </div>
                            <span className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</span>
                          </div>
                        </td>
                        <td className="table-td">
                          <div className="flex items-center justify-center gap-1.5 text-gray-600">
                            <Mail size={12} />{emp.email}
                          </div>
                        </td>
                        <td className="table-td">
                          <div className="flex items-center justify-center gap-1.5 text-gray-600">
                            <Phone size={12} />{emp.mobileNumber}
                          </div>
                        </td>
                        <td className="table-td">
                          {roleName ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                              <Shield size={10} />{roleName}
                            </span>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="table-td">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => { setEdit(emp); setFormOpen(true) }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleResendInvite(emp)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Resend invite">
                              <Send size={14} />
                            </button>
                            <button onClick={() => setDel(emp)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
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
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
                <span className="text-xs text-gray-500">Page {page} of {pages} · {total} total</span>
                <div className="flex gap-1">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 hover:bg-gray-200 disabled:opacity-40 bg-white">
                    Prev
                  </button>
                  <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 hover:bg-gray-200 disabled:opacity-40 bg-white">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <EmployeeForm open={formOpen} onClose={() => setFormOpen(false)} edit={editEmp} roles={roles} onSaved={loadEmployees} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDel(null)} onConfirm={handleDelete}
        title="Delete Employee" message={`Delete ${deleteTarget?.firstName} ${deleteTarget?.lastName}?`} danger />
    </div>
  )
}
