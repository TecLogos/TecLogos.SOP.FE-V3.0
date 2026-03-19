import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { sopAPI } from '../../services/api'
import { Spinner } from '../../shared/components/Loaders'
import { ArrowLeft, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminSopFormPage() {
  const { id }   = useParams()
  const isEdit   = !!id
  const navigate = useNavigate()
  const location = useLocation()
  const isView   = location.pathname.includes('/view/')
  const passedSop = location.state?.sop

  const [form, setForm]       = useState({ sopTitle: '', expirationDate: '', remark: '' })
  const [file, setFile]       = useState(null)
  const [initialFile, setInit]= useState('') // just to show name if available
  const [loading, setLoading] = useState(isEdit && !passedSop)
  const [saving, setSaving]   = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (!isEdit) return
    if (passedSop) {
      setForm({
        sopTitle: passedSop.sopTitle || '',
        expirationDate: passedSop.expirationDate ? String(passedSop.expirationDate).slice(0, 10) : '',
        remark: passedSop.remark || '',
      })
      setInit(passedSop.sopDocument || '')
      setLoading(false)
    } else {
      // Fallback: fetch by ID using GET /api/v1/SopDetail/{sopId}
      setLoading(true)
      sopAPI.getById(id)
        .then(({ data }) => {
          const sop = data?.data ?? data?.Data ?? data
          if (sop) {
            setForm({
              sopTitle: sop.SopTitle || sop.sopTitle || '',
              expirationDate: (sop.ExpirationDate || sop.expirationDate)
                ? String(sop.ExpirationDate || sop.expirationDate).slice(0, 10)
                : '',
              remark: sop.Remark || sop.remark || '',
            })
            setInit(sop.SopDocument || sop.sopDocument || '')
          } else {
            toast.error('SOP not found')
            navigate('/admin/sops')
          }
        })
        .catch(() => { toast.error('Failed to load SOP details'); navigate('/admin/sops') })
        .finally(() => setLoading(false))
    }
  }, [id, isEdit, passedSop, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (!isEdit && !file) {
        toast.error('Please choose a PDF file')
        setSaving(false)
        return
      }

      const fd = new FormData()
      fd.append('SopTitle', form.sopTitle)
      if (form.expirationDate) fd.append('ExpirationDate', form.expirationDate)
      if (form.remark) fd.append('Remark', form.remark)
      if (file) fd.append('DocumentFile', file)

      if (isEdit) {
        await sopAPI.update(id, fd)
        toast.success('SOP updated successfully')
      } else {
        await sopAPI.create(fd)
        toast.success('SOP created successfully')
      }
      navigate('/admin/sops')
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
            <button type="button" onClick={() => navigate('/admin/sops')}
              className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="page-title">{isView ? 'View SOP' : isEdit ? 'Edit SOP' : 'Upload New SOP'}</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {isView ? 'View standard operating procedure details' : isEdit ? 'Update standard operating procedure details' : 'Upload and submit a new standard operating procedure'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/admin/sops')}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors">
              {isView ? 'Back' : 'Cancel'}
            </button>
            {!isView && (
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Spinner size="sm" />}
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create SOP'}
              </button>
            )}
          </div>
        </div>

        {/* Form card */}
        <div className="card-surface border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4 max-w-2xl">
          <div>
            <label className="label">SOP Title *</label>
            <input className="input" required value={form.sopTitle} disabled={isView}
              onChange={e => setForm(f => ({ ...f, sopTitle: e.target.value }))}
              placeholder="e.g. Emergency Shutdown Procedure" />
          </div>
          <div>
            <label className="label">Expiry Date</label>
            <input type="date" className="input" value={form.expirationDate} disabled={isView}
              onChange={e => setForm(f => ({ ...f, expirationDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea rows={3} className="input resize-none" value={form.remark} disabled={isView}
              onChange={e => setForm(f => ({ ...f, remark: e.target.value }))}
              placeholder="Optional notes…" />
          </div>

          {!isView && (
            <div>
              <label className="label">{isEdit ? 'Replace PDF (optional)' : 'PDF Document *'}</label>
              <div onClick={() => fileRef.current.click()}
                className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-slate-400 hover:bg-gray-100 transition-all">
                <Upload size={20} className="text-gray-400" />
                <span className="text-sm text-gray-500">{file ? file.name : (initialFile && isEdit) ? `Current: ${initialFile.split(/[\\/]/).pop()} (Click to replace)` : 'Click to browse PDF'}</span>
              </div>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                onChange={e => setFile(e.target.files[0])} />
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
