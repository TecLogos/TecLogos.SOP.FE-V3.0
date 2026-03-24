import { FileSearch } from 'lucide-react'

export function Spinner({ size = 'md' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size]
  return (
    <svg className={`${s} animate-spin text-brand-600`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <Spinner size="lg" />
    </div>
  )
}

export function EmptyState({ title = 'No records found', desc = '', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="p-4 bg-surface-100 rounded-2xl">
        <FileSearch size={28} className="text-surface-400" />
      </div>
      <div>
        <p className="font-semibold text-surface-700">{title}</p>
        {desc && <p className="text-sm text-surface-500 mt-1">{desc}</p>}
      </div>
      {action}
    </div>
  )
}
