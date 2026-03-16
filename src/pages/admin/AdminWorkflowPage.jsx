import { useEffect, useState } from 'react'
import { sopAPI, groupAPI, rolesAPI } from '../../services/api'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { Spinner, EmptyState } from '../../components/common/Loaders'
import { Plus, Pencil, Trash2, GitBranch, PlusCircle, X, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Row factory ───────────────────────────────────────────────────────────
const emptyRow = () => ({
  _key:            Math.random().toString(36).slice(2),
  approvalLevel:   1,
  isSupervisor:    false,
  employeeGroupID: '',
})

// ─────────────────────────────────────────────────────────────────────────
// ADD / EDIT  MODAL  (matches screenshot exactly)
// ─────────────────────────────────────────────────────────────────────────
function StageFormModal({ open, onClose, editStage, groups, onSaved }) {
  const [stageName, setStageName] = useState('')
  const [rows, setRows]           = useState([emptyRow()])
  const [saving, setSaving]       = useState(false)

  // Populate on open
  useEffect(() => {
    if (!open) return
    if (editStage) {
      setStageName(editStage.stageName || '')
      setRows([{
        _key:            editStage.id,
        approvalLevel:   editStage.approvalLevel ?? 1,
        isSupervisor:    editStage.isSupervisor ?? false,
        employeeGroupID: editStage.employeeGroupID || '',
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
    if (rows.length === 1) return   // keep at least 1
    setRows(prev => prev.filter(r => r._key !== key))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stageName.trim()) return toast.error('Stage Name is required')
    for (const r of rows) {
      if (!r.employeeGroupID) return toast.error('Employee Group is required for all rows')
    }

    setSaving(true)
    try {
      if (editStage) {
        // Single stage update
        await sopAPI.updateWorkflowStage(editStage.id, {
          stageName,
          approvalLevel:   rows[0].approvalLevel,
          isSupervisor:    rows[0].isSupervisor,
          employeeGroupID: rows[0].employeeGroupID,
        })
        toast.success('Workflow stage updated')
      } else {
        // Bulk create — one POST with all rows
        const payload = rows.map(r => ({
          stageName,
          approvalLevel:   r.approvalLevel,
          isSupervisor:    r.isSupervisor,
          employeeGroupID: r.employeeGroupID,
        }))
        await sopAPI.bulkCreateWorkflowStages(payload)
        toast.success(`${rows.length} stage${rows.length > 1 ? 's' : ''} created`)
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const isEdit = !!editStage

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Workflow Stage' : 'Add Workflow Stage(s)'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* ── Stage Name (single, top) ─────────────────────────────── */}
        <div>
          <label className="flex items-center gap-1 text-xs font-bold text-surface-700 uppercase tracking-wider mb-2">
            Stage Name <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full px-4 py-2.5 text-sm border border-surface-300 rounded-xl
                       placeholder:text-surface-400 focus:outline-none focus:ring-2
                       focus:ring-brand-500/30 focus:border-brand-500 transition-all"
            placeholder="e.g. Operations Supervisor"
            value={stageName}
            onChange={e => setStageName(e.target.value)}
            required
          />
        </div>

        {/* ── Column headers ──────────────────────────────────────── */}
        <div className="grid grid-cols-[1fr_1fr_1.5fr_36px] gap-3 px-1">
          <span className="text-xs font-bold text-surface-500 uppercase tracking-wider">
            Approval Level
          </span>
          <span className="text-xs font-bold text-surface-500 uppercase tracking-wider">
            Is Supervisor?
          </span>
          <span className="text-xs font-bold text-surface-500 uppercase tracking-wider">
            Employee Group <span className="text-red-400">*</span>
          </span>
          <span />
        </div>

        {/* ── Rows ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto -mt-2">
          {rows.map((row) => (
            <div
              key={row._key}
              className="grid grid-cols-[1fr_1fr_1.5fr_36px] gap-3 items-center
                         border border-surface-200 rounded-2xl px-4 py-3 bg-white
                         hover:border-brand-200 transition-colors"
            >
              {/* Approval Level */}
              <select
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl bg-white
                           focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500
                           transition-all cursor-pointer"
                value={row.approvalLevel}
                onChange={e => setRow(row._key, 'approvalLevel', Number(e.target.value))}
              >
                <option value={0}>Supervisor</option>
                <option value={1}>Level 1</option>
                <option value={2}>Level 2</option>
                <option value={3}>Level 3</option>
              </select>

              {/* Is Supervisor */}
              <select
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl bg-white
                           focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500
                           transition-all cursor-pointer"
                value={row.isSupervisor ? 'true' : 'false'}
                onChange={e => setRow(row._key, 'isSupervisor', e.target.value === 'true')}
              >
                <option value="false">No (Approver)</option>
                <option value="true">Yes (Supervisor)</option>
              </select>

              {/* Employee Group */}
              <select
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl bg-white
                           focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500
                           transition-all cursor-pointer"
                value={row.employeeGroupID}
                onChange={e => setRow(row._key, 'employeeGroupID', e.target.value)}
                required
              >
                <option value="">— Select Group —</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>

              {/* Remove ✕ */}
              <button
                type="button"
                onClick={() => removeRow(row._key)}
                disabled={rows.length === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-300
                           hover:text-red-500 hover:bg-red-50 disabled:opacity-30
                           disabled:cursor-not-allowed transition-all"
                title="Remove row"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>

        {/* ── Bottom bar (matches screenshot layout exactly) ───────── */}
        <div className="flex items-center gap-3 pt-3 border-t border-surface-100">

          {/* Left: count + Add Another Stage button */}
          <div className="flex items-center gap-3">
            {!isEdit && rows.length > 0 && (
              <span className="text-sm font-semibold text-brand-600 whitespace-nowrap">
                {rows.length} stage{rows.length > 1 ? 's' : ''} to be saved
              </span>
            )}
            {!isEdit && (
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1.5 text-sm font-semibold text-brand-600
                           border-2 border-brand-300 rounded-xl px-4 py-2
                           hover:bg-brand-50 hover:border-brand-500 transition-all whitespace-nowrap"
              >
                <PlusCircle size={16} />
                Add Another Stage
              </button>
            )}
          </div>

          {/* Right: Cancel + Save */}
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-surface-700 border border-surface-300
                         rounded-xl hover:bg-surface-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl
                         hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all flex items-center gap-2 whitespace-nowrap"
            >
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

// ─────────────────────────────────────────────────────────────────────────
// MAIN WORKFLOW PAGE
// ─────────────────────────────────────────────────────────────────────────
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
      const [s, g] = await Promise.all([
        sopAPI.getWorkflowStages(),
        groupAPI.getAll(),
      ])
      setStages(s.data?.data || [])
      setGroups(g.data || [])
    } catch { toast.error('Failed to load workflow') }
    finally   { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEdit(null); setFormOpen(true) }
  const openEdit   = (s)  => { setEdit(s);  setFormOpen(true) }

  const handleDelete = async () => {
    try {
      await sopAPI.deleteWorkflowStage(delTarget.id)
      toast.success('Stage deleted')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    }
  }

  const supervisorStages = stages.filter(s => s.isSupervisor)
  const approverStages   = stages.filter(s => !s.isSupervisor)
                                  .sort((a,b) => a.approvalLevel - b.approvalLevel)

  const levelLabel = (s) => s.isSupervisor ? 'Supervisor' : `Level ${s.approvalLevel}`
  const levelColor = (s) => s.isSupervisor
    ? 'bg-blue-50 text-blue-700'
    : s.approvalLevel === 1 ? 'bg-violet-50 text-violet-700'
    : s.approvalLevel === 2 ? 'bg-purple-50 text-purple-700'
    : 'bg-fuchsia-50 text-fuchsia-700'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Workflow Setup</h1>
          <p className="text-sm text-surface-500 mt-1">
            Configure multi-level SOP approval stages
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={14} /> Add Stage
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !stages.length ? (
          <EmptyState
            title="No workflow stages configured"
            desc="Add at least one supervisor stage and up to three approval levels"
            action={
              <button onClick={openCreate} className="btn-primary mt-2">
                <Plus size={14} /> Add First Stage
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr>
                  <th className="table-th">Stage Name</th>
                  <th className="table-th">Level</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Employee Group</th>
                  <th className="table-th w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...supervisorStages, ...approverStages].map(stage => (
                  <tr key={stage.id} className="hover:bg-surface-50 transition-colors group">
                    <td className="table-td">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                          ${stage.isSupervisor ? 'bg-blue-100' : 'bg-violet-100'}`}>
                          <GitBranch size={13}
                            className={stage.isSupervisor ? 'text-blue-700' : 'text-violet-700'} />
                        </div>
                        <span className="font-medium text-surface-900 group-hover:text-brand-600 transition-colors">
                          {stage.stageName}
                        </span>
                      </div>
                    </td>
                    <td className="table-td">
                      <span className={`badge ${levelColor(stage)}`}>{levelLabel(stage)}</span>
                    </td>
                    <td className="table-td">
                      <span className={`badge ${stage.isSupervisor
                        ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {stage.isSupervisor ? 'Supervisor' : 'Approver'}
                      </span>
                    </td>
                    <td className="table-td text-surface-600">{stage.groupName || '—'}</td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(stage)}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDel(stage)}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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

      {/* Summary cards */}
      {stages.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Supervisors',     count: supervisorStages.length,
              color: 'bg-blue-50 text-blue-700 border-blue-100' },
            { label: 'Approval Levels', count: [...new Set(approverStages.map(s=>s.approvalLevel))].length,
              color: 'bg-violet-50 text-violet-700 border-violet-100' },
            { label: 'Total Stages',    count: stages.length,
              color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          ].map(({ label, count, color }) => (
            <div key={label} className={`rounded-xl border px-4 py-3 flex items-center justify-between ${color}`}>
              <span className="text-sm font-medium">{label}</span>
              <span className="text-2xl font-bold">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
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
        title="Delete Stage"
        message={`Delete "${delTarget?.stageName}"? This will affect the SOP approval workflow.`}
        danger
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// ROLES PAGE
// ─────────────────────────────────────────────────────────────────────────
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
    try { const { data } = await rolesAPI.getAll(); setItems(data || []) }
    catch { toast.error('Load failed') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openForm = (item = null) => { setEdit(item); setName(item?.name || ''); setOpen(true) }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (edit) await rolesAPI.update({ id: edit.id, name })
      else      await rolesAPI.create({ name })
      toast.success(`Role ${edit ? 'updated' : 'created'}`)
      load(); setOpen(false)
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await rolesAPI.delete(del.id); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Roles</h1>
        <button onClick={() => openForm()} className="btn-primary">
          <Plus size={14} /> New Role
        </button>
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) =>
              <div key={i} className="h-10 bg-surface-100 rounded-xl animate-pulse" />)}
          </div>
        ) : !items.length ? (
          <EmptyState title="No roles yet" />
        ) : (
          <div className="divide-y divide-surface-100">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 transition-colors">
                <span className="text-sm font-medium text-surface-800 flex-1">{item.name}</span>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openForm(item)}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setDel(item)}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)}
        title={edit ? 'Edit Role' : 'New Role'} size="sm">
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
        title="Delete Role" message={`Delete role "${del?.name}"?`} danger />
    </div>
  )
}
