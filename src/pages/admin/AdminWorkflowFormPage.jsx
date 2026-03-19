import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { workflowAPI, groupAPI } from '../../services/api'
import { Spinner } from '../../shared/components/Loaders'
import { ArrowLeft, PlusCircle, X, Info } from 'lucide-react'
import toast from 'react-hot-toast'

const LEVEL_LABELS = {
  0: 'Not Started', 1: 'In Progress', 2: 'Submitted',
  3: 'Level 1', 4: 'Level 2', 5: 'Level 3 (Max)',
}

const emptyRow = () => ({
  _key:            Math.random().toString(36).slice(2),
  approvalLevel:   3,
  isSupervisor:    false,
  employeeGroupID: '',
})

export default function AdminWorkflowFormPage() {
  const { id }   = useParams()
  const isEdit   = !!id
  const navigate = useNavigate()
  const location = useLocation()
  const isView   = location.pathname.includes('/view/')

  const [stageName, setStageName] = useState('')
  const [rows, setRows]           = useState([emptyRow()])
  const [groups, setGroups]       = useState([])
  const [loading, setLoading]     = useState(isEdit)
  const [saving, setSaving]       = useState(false)

  // Load groups
  useEffect(() => {
    groupAPI.getAll().then(r => {
      const grps = r.data?.data ?? r.data?.Data ?? r.data
      setGroups(Array.isArray(grps) ? grps : [])
    }).catch(() => {})
  }, [])

  // Load stage for edit — GET /api/v1/WorkFlowSetUp/{id}
  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    workflowAPI.getById(id)
      .then(({ data }) => {
        const s = data?.data ?? data
        setStageName(s.stageName || s.StageName || '')
        setRows([{
          _key:            s.id || s.ID,
          approvalLevel:   s.approvalLevel ?? s.ApprovalLevel ?? 3,
          isSupervisor:    s.isSupervisor  ?? s.IsSupervisor  ?? false,
          employeeGroupID: s.employeeGroupID || s.EmployeeGroupID || '',
        }])
      })
      .catch(() => toast.error('Failed to load workflow stage'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const setRow = (key, field, val) =>
    setRows(prev => prev.map(r => r._key === key ? { ...r, [field]: val } : r))

  const addRow    = () => setRows(prev => [...prev, emptyRow()])
  const removeRow = (key) => {
    if (rows.length === 1) return
    setRows(prev => prev.filter(r => r._key !== key))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stageName.trim()) return toast.error('Stage Name is required')
    for (const r of rows) {
      if (!r.isSupervisor && !r.employeeGroupID)
        return toast.error('Employee Group is required for non-supervisor stages')
    }
    setSaving(true)
    try {
      if (isEdit) {
        const row = rows[0]
        await workflowAPI.update(id, {
          stageName,
          approvalLevel:   row.approvalLevel,
          isSupervisor:    row.isSupervisor,
          employeeGroupID: row.isSupervisor ? null : (row.employeeGroupID || null),
        })
        toast.success('Workflow stage updated')
      } else {
        const payload = rows.map(r => ({
          stageName,
          approvalLevel:   r.approvalLevel,
          isSupervisor:    r.isSupervisor,
          employeeGroupID: r.isSupervisor ? null : (r.employeeGroupID || null),
        }))
        await workflowAPI.bulkCreate(payload)
        toast.success(`${rows.length} stage${rows.length > 1 ? 's' : ''} created`)
      }
      navigate('/admin/workflow')
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

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
           
            <div>
              <h1 className="page-title">{isView ? 'View Workflow Stage' : isEdit ? 'Edit Workflow Stage' : 'Add Workflow Stage(s)'}</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {isView ? 'View workflow stage configuration' : isEdit ? 'Update the approval stage configuration' : 'Add one or more stages to the approval pipeline'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isEdit && rows.length > 0 && (
              <span className="text-sm font-semibold text-slate-700 px-3">
                {rows.length} stage{rows.length > 1 ? 's' : ''} to be saved
              </span>
            )}
            <button type="button" onClick={() => navigate('/admin/workflow')}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors">
              {isView ? 'Back' : 'Cancel'}
            </button>
            {!isView && (
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Spinner size="sm" />}
                {saving ? 'Saving…' : isEdit ? 'Update Stage' : `Save ${rows.length > 1 ? `${rows.length} Stages` : 'Stage'}`}
              </button>
            )}
          </div>
        </div>

        {/* Form card */}
        <div className="card-surface border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">

            {/* Stage Name */}
            <div>
              <label className="label">Stage Name *</label>
              <input className="input" required placeholder="e.g. Operations Supervisor Review" disabled={isView}
                value={stageName} onChange={e => setStageName(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">
                One name can cover multiple approval rows (e.g. same stage at different levels).
              </p>
            </div>

            {/* Column headers */}
            <div className={`grid gap-3 px-1 ${isEdit ? 'grid-cols-[1fr_1fr_1.5fr]' : 'grid-cols-[1fr_1fr_1.5fr_36px]'}`}>
              <span className="label mb-0">Approval Level</span>
              <span className="label mb-0">Type</span>
              <span className="label mb-0">Employee Group {!rows[0]?.isSupervisor && '*'}</span>
              {!isEdit && <span />}
            </div>

            {/* Stage rows */}
            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto -mt-2">
              {rows.map(row => (
                <div key={row._key}
                  className={`grid gap-3 items-center border border-gray-200 rounded-xl px-4 py-3 bg-white hover:border-gray-300 transition-colors
                    ${isEdit ? 'grid-cols-[1fr_1fr_1.5fr]' : 'grid-cols-[1fr_1fr_1.5fr_36px]'}`}>

                  {/* Approval Level */}
                  <select className="input bg-white" value={row.approvalLevel} disabled={isView}
                    onChange={e => setRow(row._key, 'approvalLevel', Number(e.target.value))}>
                    {Object.entries(LEVEL_LABELS).map(([val, label]) => (
                      <option key={val} value={Number(val)}>{label}</option>
                    ))}
                  </select>

                  {/* Type */}
                  <select className="input bg-white" value={row.isSupervisor ? 'true' : 'false'} disabled={isView}
                    onChange={e => {
                      const isSup = e.target.value === 'true'
                      setRow(row._key, 'isSupervisor', isSup)
                      if (isSup) setRow(row._key, 'employeeGroupID', '')
                    }}>
                    <option value="false">Approver (Group-based)</option>
                    <option value="true">Supervisor (Manager-based)</option>
                  </select>

                  {/* Employee Group */}
                  <select className="input bg-white" value={row.employeeGroupID}
                    onChange={e => setRow(row._key, 'employeeGroupID', e.target.value)}
                    disabled={row.isSupervisor || isView} required={!row.isSupervisor}>
                    <option value="">
                      {row.isSupervisor ? '— N/A (manager-based) —' : '— Select Group —'}
                    </option>
                    {!row.isSupervisor && groups.map(g => (
                      <option key={g.id || g.ID} value={g.id || g.ID}>{g.name || g.Name}</option>
                    ))}
                  </select>

                  {/* Remove (create mode only) */}
                  {!isEdit && (
                    <button type="button" onClick={() => removeRow(row._key)}
                      disabled={rows.length === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Info box */}
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                <strong>Supervisor (Level 2):</strong> authorised via the SOP creator's direct manager — no group needed.<br />
                <strong>Approver levels 3–5:</strong> authorised by membership in the selected employee group.
              </p>
            </div>

            {/* Add More button (create mode only) */}
            {!isEdit && (
              <div className="flex items-center pt-3 border-t border-gray-100">
                <button type="button" onClick={addRow}
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border-2 border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-100 hover:border-gray-400 transition-all">
                  <PlusCircle size={15} /> Add Another Stage Row
                </button>
              </div>
            )}

        </div>
      </form>
    </div>
  )
}
