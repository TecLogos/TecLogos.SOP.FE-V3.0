import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { workflowAPI, groupAPI} from '../../services/api'
import ConfirmDialog from '../../shared/components/ConfirmDialog'
import { EmptyState } from '../../shared/components/Loaders'
import { Plus, Pencil, Trash2, GitBranch, RefreshCw, BookOpen, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

const LEVEL_COLORS = {
  0: 'bg-gray-100 text-gray-600',
  1: 'bg-amber-100 text-amber-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-violet-100 text-violet-700',
  4: 'bg-purple-100 text-purple-700',
  5: 'bg-fuchsia-100 text-fuchsia-700',
}

// ── Workflow Page ─────────────────────────────────────────────────────────
export function AdminWorkflowPage() {
  const navigate = useNavigate()

  const [stages, setStages]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [delTarget, setDel]     = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      // GET /api/v1/WorkFlowSetUp/list
      const stagesRes = await workflowAPI.getAll()
      const stageData = stagesRes.data?.data ?? stagesRes.data?.Data ?? stagesRes.data ?? []
      setStages(Array.isArray(stageData) ? stageData : [])
    } catch {
      toast.error('Failed to load workflow configuration')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    try {
      await workflowAPI.delete(delTarget.id || delTarget.ID)
      toast.success('Stage deleted'); load()
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.Message || 'Delete failed')
    }
  }

  // const supervisorStages = stages.filter(s => s.isSupervisor || s.IsSupervisor)
  // const approverStages   = stages.filter(s => !(s.isSupervisor || s.IsSupervisor))
  //   .sort((a, b) => (a.approvalLevel ?? a.ApprovalLevel) - (b.approvalLevel ?? b.ApprovalLevel))

  const getLevel = s => s.approvalLevel ?? s.ApprovalLevel ?? 0
  const getName  = s => s.stageName     ?? s.StageName     ?? '—'
  const getGroup = s => s.groupName     ?? s.GroupName     ?? '—'
  const getId    = s => s.id            ?? s.ID
  const getIsSup = s => s.isSupervisor  ?? s.IsSupervisor  ?? false

  return (
    <div className="min-h-screen p-6 surface space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Workflow Setup</h1>
          <p className="text-gray-500 text-sm mt-1">Configure the SOP multi-level approval pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/admin/workflow/new')} className="btn-primary">
            <Plus size={15} /> Add Stage
          </button>
          <button onClick={load}
            className="p-2 rounded-md border-2 border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Pipeline visual */}
      {stages.length > 0 && (
        <div className="card-surface border border-gray-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Approval Order</p>
          <div className="flex items-center gap-2 flex-wrap">
            {[...stages].sort((a, b) => getLevel(a) - getLevel(b)).map((s, i, arr) => (
              <div key={getId(s)} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold
                  ${LEVEL_COLORS[getLevel(s)] || 'bg-gray-100 text-gray-600'} border-current border-opacity-30`}>
                  <span className="opacity-60">L{getLevel(s)}</span>
                  <span>{getName(s)}</span>
                </div>
                {i < arr.length - 1 && <span className="text-gray-300 text-lg font-light">→</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card-surface border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : !stages.length ? (
          <EmptyState
            title="No workflow stages configured"
            desc="Add at least one supervisor stage (Level 2) and up to three approval levels (3–5)"
            action={
              <button onClick={() => navigate('/admin/workflow/new')} className="btn-primary mt-2">
                <Plus size={14} /> Add Stage
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
                  <th className="table-th">Supervisor Approval Required</th>
                  <th className="table-th">Employee Group</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-50 divide-y divide-gray-200">
                {stages.map((stage, idx) => (
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold`}>
                        {getLevel(stage)}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold`}>
                        {getIsSup(stage) ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="table-td">
                      {getIsSup(stage)
                        ? <span className="text-xs text-gray-400 italic">(Supervisor Approval)</span>
                        : <span className="text-gray-700">{getGroup(stage)}</span>}
                    </td>
                    <td className="table-td">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => navigate(`/admin/workflow/view/${getId(stage)}`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View Details">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => navigate(`/admin/workflow/edit/${getId(stage)}`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDel(stage)}
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

      <ConfirmDialog
        open={!!delTarget} onClose={() => setDel(null)} onConfirm={handleDelete}
        title="Delete Workflow Stage"
        message={`Delete "${getName(delTarget ?? {})}"? Existing SOPs at this stage will not be affected.`}
        danger
      />
    </div>
  )
}

// ── Roles Page ────────────────────────────────────────────────────────────
export function AdminRolesPage() {
  const navigate = useNavigate()

  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(false)
  const [del, setDel]         = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await rolesAPI.getAll()
      setItems(Array.isArray(data) ? data : [])
    } catch { toast.error('Load failed') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

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
          <button onClick={() => navigate('/admin/roles/new')} className="btn-primary">
            <Plus size={15} /> New Role
          </button>
          <button onClick={load}
            className="p-2 rounded-md border-2 border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200" title="Refresh">
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
                      <button onClick={() => navigate(`/admin/roles/view/${item.id || item.ID}`)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View Details">
                        <Eye size={13} />
                      </button>
                      <button onClick={() => navigate(`/admin/roles/edit/${item.id || item.ID}`)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit">
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

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={handleDelete}
        title="Delete Role" message={`Delete role "${del?.name || del?.Name}"?`} danger />
    </div>
  )
}
