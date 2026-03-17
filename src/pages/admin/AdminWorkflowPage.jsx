import { useEffect, useState } from 'react'
import { workflowAPI, groupAPI, rolesAPI } from '../../services/api'
import Modal from '../../shared/components/Modal'
import ConfirmDialog from '../../shared/components/ConfirmDialog'
import { Spinner, EmptyState } from '../../shared/components/Loaders'
import { Plus, Pencil, Trash2, GitBranch, PlusCircle, X, RefreshCw, BookOpen, Info } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Workflow stage levels (from DB schema / Enums.cs):
 *   0 = Not Started   (Admin Group)
 *   1 = In Progress   (Initiator Group)
 *   2 = Submitted     (Supervisor — manager-based, IsSupervisor=true, no group)
 *   3 = Level 1       (L1 Approver Group)
 *   4 = Level 2       (L2 Approver Group)
 *   5 = Level 3 / MAX (L3 Approver Group → triggers Completed on approve)
 */

const LEVEL_LABELS = {
  0: 'Not Started',
  1: 'In Progress',
  2: 'Submitted',
  3: 'Level 1',
  4: 'Level 2',
  5: 'Level 3 (Max)',
}

const LEVEL_COLORS = {
  0: 'bg-gray-100 text-gray-600',
  1: 'bg-amber-100 text-amber-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-violet-100 text-violet-700',
  4: 'bg-purple-100 text-purple-700',
  5: 'bg-fuchsia-100 text-fuchsia-700',
}

// ── Blank row factory ─────────────────────────────────────────────────────
const emptyRow = () => ({
  _key:            Math.random().toString(36).slice(2),
  approvalLevel:   3,
  isSupervisor:    false,
  employeeGroupID: '',
})

// ── Stage Form Modal ──────────────────────────────────────────────────────
function StageFormModal({ open, onClose, editStage, groups, onSaved }) {
  const [stageName, setStageName] = useState('')
  const [rows, setRows]           = useState([emptyRow()])
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (!open) return
    if (editStage) {
      // Editing: single row pre-filled from existing stage
      setStageName(editStage.stageName || editStage.StageName || '')
      setRows([{
        _key:            editStage.id || editStage.ID,
        approvalLevel:   editStage.approvalLevel ?? editStage.ApprovalLevel ?? 3,
        isSupervisor:    editStage.isSupervisor  ?? editStage.IsSupervisor  ?? false,
        employeeGroupID: editStage.employeeGroupID || editStage.EmployeeGroupID || '',
      }])
    } else {
      setStageName('')
      setRows([emptyRow()])
    }
  }, [open, editStage])

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
      // Supervisor stage (level 2) doesn't need a group
      if (!r.isSupervisor && !r.employeeGroupID) {
        return toast.error('Employee Group is required for non-supervisor stages')
      }
    }

    setSaving(true)
    try {
      if (editStage) {
        // Single update
        const row = rows[0]
        await workflowAPI.update(editStage.id || editStage.ID, {
          stageName:       stageName,
          approvalLevel:   row.approvalLevel,
          isSupervisor:    row.isSupervisor,
          employeeGroupID: row.isSupervisor ? null : (row.employeeGroupID || null),
        })
        toast.success('Workflow stage updated')
      } else {
        // Bulk create — all rows share the same StageName
        const payload = rows.map(r => ({
          stageName:       stageName,
          approvalLevel:   r.approvalLevel,
          isSupervisor:    r.isSupervisor,
          employeeGroupID: r.isSupervisor ? null : (r.employeeGroupID || null),
        }))
        await workflowAPI.bulkCreate(payload)
        toast.success(`${rows.length} stage${rows.length > 1 ? 's' : ''} created`)
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.Message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const isEdit = !!editStage

  return (
    <Modal open={open} onClose={onClose}
      title={isEdit ? 'Edit Workflow Stage' : 'Add Workflow Stage(s)'} size="xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Stage Name */}
        <div>
          <label className="label">Stage Name *</label>
          <input className="input" placeholder="e.g. Operations Supervisor Review"
            value={stageName} onChange={e => setStageName(e.target.value)} required />
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

        {/* Rows */}
        <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto -mt-2">
          {rows.map(row => (
            <div key={row._key}
              className={`grid gap-3 items-center border border-gray-200 rounded-xl px-4 py-3 bg-white hover:border-gray-300 transition-colors
                ${isEdit ? 'grid-cols-[1fr_1fr_1.5fr]' : 'grid-cols-[1fr_1fr_1.5fr_36px]'}`}>

              {/* Approval Level */}
              <select className="input bg-white" value={row.approvalLevel}
                onChange={e => setRow(row._key, 'approvalLevel', Number(e.target.value))}>
                {Object.entries(LEVEL_LABELS).map(([val, label]) => (
                  <option key={val} value={Number(val)}>{label}</option>
                ))}
              </select>

              {/* Type (IsSupervisor) */}
              <select className="input bg-white" value={row.isSupervisor ? 'true' : 'false'}
                onChange={e => {
                  const isSup = e.target.value === 'true'
                  setRow(row._key, 'isSupervisor', isSup)
                  // Clear group when switching to supervisor (no group needed)
                  if (isSup) setRow(row._key, 'employeeGroupID', '')
                }}>
                <option value="false">Approver (Group-based)</option>
                <option value="true">Supervisor (Manager-based)</option>
              </select>

              {/* Employee Group */}
              <select className="input bg-white" value={row.employeeGroupID}
                onChange={e => setRow(row._key, 'employeeGroupID', e.target.value)}
                disabled={row.isSupervisor}
                required={!row.isSupervisor}>
                <option value="">
                  {row.isSupervisor ? '— N/A (manager-based auth) —' : '— Select Group —'}
                </option>
                {!row.isSupervisor && groups.map(g => (
                  <option key={g.id || g.ID} value={g.id || g.ID}>
                    {g.name || g.Name}
                  </option>
                ))}
              </select>

              {/* Remove button (create mode only) */}
              {!isEdit && (
                <button type="button" onClick={() => removeRow(row._key)}
                  disabled={rows.length === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Remove row">
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

        {/* Footer */}
        <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-3">
            {!isEdit && rows.length > 0 && (
              <span className="text-sm font-semibold text-slate-700">
                {rows.length} stage{rows.length > 1 ? 's' : ''} to be saved
              </span>
            )}
            {!isEdit && (
              <button type="button" onClick={addRow}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 border-2 border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-100 hover:border-gray-400 transition-all">
                <PlusCircle size={15} /> Add Another Stage
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Spinner size="sm" />}
              {saving
                ? 'Saving…'
                : isEdit
                  ? 'Update Stage'
                  : `Save ${rows.length > 1 ? `${rows.length} Stages` : 'Stage'}`}
            </button>
          </div>
        </div>

      </form>
    </Modal>
  )
}

// ── Main Workflow Page ────────────────────────────────────────────────────
export function AdminWorkflowPage() {
  const [stages, setStages]     = useState([])
  const [groups, setGroups]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editStage, setEdit]    = useState(null)
  const [delTarget, setDel]     = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [stagesRes, groupsRes] = await Promise.all([
        workflowAPI.getAll(),
        groupAPI.getAll(),
      ])
      // GET api/v1/workflowsetup/list → { success, data: [...] }
      const stageData = stagesRes.data?.data ?? stagesRes.data?.Data ?? stagesRes.data ?? []
      setStages(Array.isArray(stageData) ? stageData : [])

      // GET api/v1/employeegroup/list → plain array
      const groupData = groupsRes.data
      setGroups(Array.isArray(groupData) ? groupData : [])
    } catch {
      toast.error('Failed to load workflow configuration')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    try {
      await workflowAPI.delete(delTarget.id || delTarget.ID)
      toast.success('Stage deleted')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.Message || 'Delete failed')
    }
  }

  // Separate supervisor vs approver rows for display
  const supervisorStages = stages.filter(s => s.isSupervisor || s.IsSupervisor)
  const approverStages   = stages.filter(s => !(s.isSupervisor || s.IsSupervisor))
    .sort((a, b) => (a.approvalLevel ?? a.ApprovalLevel) - (b.approvalLevel ?? b.ApprovalLevel))

  const getLevel = (s) => s.approvalLevel ?? s.ApprovalLevel ?? 0
  const getName  = (s) => s.stageName     ?? s.StageName     ?? '—'
  const getGroup = (s) => s.groupName     ?? s.GroupName     ?? '—'
  const getId    = (s) => s.id            ?? s.ID
  const getIsSup = (s) => s.isSupervisor  ?? s.IsSupervisor  ?? false

  return (
    <div className="min-h-screen p-6 surface space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Workflow Setup</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure the SOP multi-level approval pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEdit(null); setFormOpen(true) }} className="btn-primary">
            <Plus size={15} /> Add Stage
          </button>
          <button onClick={load}
            className="p-2 rounded-md border-2 border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200"
            title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {stages.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Supervisor Stages',  count: supervisorStages.length, bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-700' },
            { label: 'Approver Stages',    count: approverStages.length,   bg: 'bg-violet-50 border-violet-200', text: 'text-violet-700' },
            { label: 'Total Stages',       count: stages.length,           bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
          ].map(({ label, count, bg, text }) => (
            <div key={label} className={`${bg} border rounded-xl px-5 py-4 flex items-center justify-between`}>
              <span className={`text-sm font-semibold ${text}`}>{label}</span>
              <span className={`text-2xl font-bold ${text}`}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline visual hint */}
      {stages.length > 0 && (
        <div className="card-surface border border-gray-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Approval Pipeline Order</p>
          <div className="flex items-center gap-2 flex-wrap">
            {[...stages]
              .sort((a, b) => getLevel(a) - getLevel(b))
              .map((s, i, arr) => (
                <div key={getId(s)} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold
                    ${LEVEL_COLORS[getLevel(s)] || 'bg-gray-100 text-gray-600'} border-current border-opacity-30`}>
                    <span className="opacity-60">L{getLevel(s)}</span>
                    <span>{getName(s)}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <span className="text-gray-300 text-lg font-light">→</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !stages.length ? (
          <EmptyState
            title="No workflow stages configured"
            desc="Add at least one supervisor stage (Level 2) and up to three approval levels (3–5)"
            action={
              <button onClick={() => { setEdit(null); setFormOpen(true) }} className="btn-primary mt-2">
                <Plus size={14} /> Add First Stage
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse text-sm text-gray-700 min-w-[640px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th-left">Stage Name</th>
                  <th className="table-th">Level</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Employee Group</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-50 divide-y divide-gray-200">
                {[...supervisorStages, ...approverStages].map((stage, idx) => (
                  <tr key={getId(stage)} className="hover:bg-white transition-colors group">
                    <td className="table-td text-gray-400">{idx + 1}</td>
                    <td className="table-td-left">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                          ${getIsSup(stage) ? 'bg-blue-100' : 'bg-violet-100'}`}>
                          <GitBranch size={13} className={getIsSup(stage) ? 'text-blue-700' : 'text-violet-700'} />
                        </div>
                        <span className="font-medium text-gray-900">{getName(stage)}</span>
                      </div>
                    </td>
                    <td className="table-td">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                        ${LEVEL_COLORS[getLevel(stage)] || 'bg-gray-100 text-gray-600'}`}>
                        {LEVEL_LABELS[getLevel(stage)] || `Level ${getLevel(stage)}`}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                        ${getIsSup(stage) ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {getIsSup(stage) ? 'Supervisor' : 'Approver'}
                      </span>
                    </td>
                    <td className="table-td">
                      {getIsSup(stage) ? (
                        <span className="text-xs text-gray-400 italic">Manager-based</span>
                      ) : (
                        <span className="text-gray-700">{getGroup(stage)}</span>
                      )}
                    </td>
                    <td className="table-td">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => { setEdit(stage); setFormOpen(true) }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDel(stage)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete">
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

      <StageFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editStage={editStage}
        groups={groups}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDel(null)}
        onConfirm={handleDelete}
        title="Delete Workflow Stage"
        message={`Delete "${getName(delTarget ?? {})}"? Existing SOPs at this stage will not be affected (history is preserved).`}
        danger
      />
    </div>
  )
}

// ── Roles Page (unchanged — same file as before) ──────────────────────────
export function AdminRolesPage() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const [edit, setEdit]       = useState(null)
  const [del, setDel]         = useState(null)
  const [name, setName]       = useState('')
  const [saving, setSaving]   = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await rolesAPI.getAll()
      setItems(Array.isArray(data) ? data : [])
    } catch { toast.error('Load failed') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openForm = (item = null) => { setEdit(item); setName(item?.name || item?.Name || ''); setOpen(true) }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (edit) await rolesAPI.update({ id: edit.id || edit.ID, name })
      else      await rolesAPI.create({ name })
      toast.success(`Role ${edit ? 'updated' : 'created'}`)
      load(); setOpen(false)
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await rolesAPI.delete(del.id || del.ID); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Roles</h1>
          <p className="text-gray-500 text-sm mt-1">Manage system roles assigned to employees</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openForm()} className="btn-primary">
            <Plus size={15} /> New Role
          </button>
          <button onClick={load}
            className="p-2 rounded-md border-2 border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200"
            title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : !items.length ? (
          <EmptyState title="No roles yet" />
        ) : (
          <table className="w-full table-auto border-collapse text-sm text-gray-700">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">#</th>
                <th className="table-th-left">Role Name</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-gray-50 divide-y divide-gray-200">
              {items.map((item, idx) => (
                <tr key={item.id || item.ID} className="hover:bg-white transition-colors">
                  <td className="table-td text-gray-400">{idx + 1}</td>
                  <td className="table-td-left">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center shrink-0">
                        <BookOpen size={13} className="text-slate-600" />
                      </div>
                      <span className="font-medium text-gray-900">{item.name || item.Name}</span>
                    </div>
                  </td>
                  <td className="table-td">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => openForm(item)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDel(item)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? 'Edit Role' : 'New Role'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Role Name *</label>
            <input className="input" required value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving && <Spinner size="sm" />} Save
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={handleDelete}
        title="Delete Role" message={`Delete role "${del?.name || del?.Name}"?`} danger />
    </div>
  )
}
