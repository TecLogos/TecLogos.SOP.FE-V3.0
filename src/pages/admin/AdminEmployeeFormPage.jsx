import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { employeeAPI, ddlAPI } from '../../services/api'
import { Spinner } from '../../shared/components/Loaders'
import { ArrowLeft, User } from 'lucide-react'
import toast from 'react-hot-toast'

const blank = { firstName: '', middleName: '', lastName: '', email: '', mobileNumber: '', managerID: '' }
const nullIfEmpty = v => (v === '' || v == null) ? null : v

export default function AdminEmployeeFormPage() {
  const { id }       = useParams()
  const isEdit       = !!id
  const navigate     = useNavigate()
  const location     = useLocation()
  const isView       = location.pathname.includes('/view/')

  const [form, setForm]       = useState(blank)
  const [allEmps, setAllEmps] = useState([])
  const [editMeta, setMeta]   = useState(null)   // stores version + isActive from fetched employee
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving]   = useState(false)

  // Load lookup data
  useEffect(() => {
    ddlAPI.employees().then(r => setAllEmps(Array.isArray(r.data) ? r.data : (r.data?.data ?? r.data?.Data ?? []))).catch(() => {})
  }, [])

  // Load employee for edit
  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    employeeAPI.getById(id)
      .then(({ data }) => {
        // API returns { success, data: { ...employee } }
        const emp = data?.data ?? data
        const empId = (emp.iD ?? emp.ID ?? emp.id ?? '').toString().toLowerCase()
        setForm({
          firstName:    emp.firstName    || emp.FirstName    || '',
          middleName:   emp.middleName   || emp.MiddleName   || '',
          lastName:     emp.lastName     || emp.LastName     || '',
          email:        emp.email        || emp.Email        || '',
          mobileNumber: emp.mobileNumber || emp.MobileNumber || '',
          managerID:    (emp.managerID   || emp.ManagerID    || '').toString(),
        })
        setMeta({
          id:       empId || id,
          version:  emp.version  ?? emp.Version  ?? 0,
          isActive: emp.isActive ?? emp.IsActive ?? true,
        })
      })
      .catch(() => toast.error('Failed to load employee'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        managerID: nullIfEmpty(form.managerID),
      }
      if (isEdit) {
        await employeeAPI.update(id, {
          ...payload,
          ID:       id,
          version:  editMeta?.version  ?? 0,
          isActive: editMeta?.isActive ?? true,
        })
        toast.success('Employee updated')
      } else {
        await employeeAPI.create(payload)
        toast.success('Employee created — onboarding email sent')
      }
      navigate('/admin/employees')
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.Message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // Manager list — exclude the employee being edited
  const managerOptions = allEmps.filter(e => {
    const eid = (e.id ?? e.ID ?? e.Id ?? '').toString().toLowerCase()
    return eid && eid !== (id ?? '').toLowerCase()
  })

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
            <button type="button" onClick={() => navigate('/admin/employees')}
              className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="page-title">{isView ? 'View Employee' : isEdit ? 'Edit Employee' : 'New Employee'}</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {isView ? 'View employee details' : isEdit ? 'Update employee information' : 'Add a new employee to the system'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/admin/employees')}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors">
              {isView ? 'Back' : 'Cancel'}
            </button>
            {!isView && (
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Spinner size="sm" />}
                {saving ? 'Saving…' : isEdit ? 'Update Employee' : 'Create Employee'}
              </button>
            )}
          </div>
        </div>

        {/* Form card */}
        <div className="card-surface border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">

            {/* Avatar hint */}
            <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
              <div className="w-12 h-12 bg-slate-100 border-2 border-slate-200 rounded-full flex items-center justify-center text-slate-600 text-lg font-bold">
                {form.firstName?.[0]?.toUpperCase() || <User size={20} />}
                {form.lastName?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {form.firstName || form.lastName ? `${form.firstName} ${form.lastName}`.trim() : 'New Employee'}
                </p>
                <p className="text-xs text-gray-400">{form.email || 'No email yet'}</p>
              </div>
            </div>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name *</label>
                <input className="input" required value={form.firstName} disabled={isView}
                  onChange={e => set('firstName', e.target.value)} placeholder="e.g. John" />
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input className="input" required value={form.lastName} disabled={isView}
                  onChange={e => set('lastName', e.target.value)} placeholder="e.g. Smith" />
              </div>
            </div>

            <div>
              <label className="label">Middle Name</label>
              <input className="input" value={form.middleName} disabled={isView}
                onChange={e => set('middleName', e.target.value)} placeholder="Optional" />
            </div>

            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" required value={form.email} disabled={isView}
                onChange={e => set('email', e.target.value)} placeholder="john.smith@company.com" />
            </div>

            <div>
              <label className="label">Mobile Number *</label>
              <input className="input" required value={form.mobileNumber} disabled={isView}
                onChange={e => set('mobileNumber', e.target.value)} placeholder="+91 98765 43210" />
            </div>

            <div className="grid grid-cols-2 gap-4">
  
              <div>
                <label className="label">Manager</label>
                <select className="input bg-white" value={form.managerID} disabled={isView}
                  onChange={e => set('managerID', e.target.value)}>
                  <option value="">— No Manager —</option>
                  {managerOptions.map(e => {
                    const eid = e.id ?? e.ID ?? e.Id
                    const fname = e.firstName ?? e.FirstName ?? ''
                    const lname = e.lastName ?? e.LastName ?? ''
                    
                    // Fallback to email if name is empty
                    const display = (fname || lname) ? `${fname} ${lname}`.trim() : (e.email ?? e.Email ?? 'Unknown')

                    return (
                      <option key={eid} value={eid}>
                        {display}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

        </div>
      </form>
    </div>
  )
}
