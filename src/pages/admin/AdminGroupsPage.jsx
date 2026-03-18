import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { groupAPI } from '../../services/api'
import ConfirmDialog from '../../shared/components/ConfirmDialog'
import { Spinner, EmptyState } from '../../shared/components/Loaders'
import { Plus, Pencil, Trash2, Users, RefreshCw, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminGroupsPage() {
  const navigate = useNavigate()

  const [groups, setGroups]         = useState([])
  const [loading, setLoading]       = useState(false)
  const [delTarget, setDel]         = useState(null)

  const load = async () => {
    setLoading(true)
    try { const { data } = await groupAPI.getAll(); setGroups(data || []) }
    catch { toast.error('Failed to load groups') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

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
          <button onClick={() => navigate('/admin/groups/new')} className="btn-primary">
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
                  <th className="table-th text-center">Actions</th>
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
                    <td className="table-td text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => navigate(`/admin/groups/view/${group.id}`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View Details">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => navigate(`/admin/groups/edit/${group.id}`)}
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

      <ConfirmDialog open={!!delTarget} onClose={() => setDel(null)} onConfirm={handleDelete}
        title="Delete Group" message={`Delete group "${delTarget?.name}"? This will remove all its members.`} danger />
    </div>
  )
}
