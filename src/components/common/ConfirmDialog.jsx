import Modal from './Modal'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className={`p-3 rounded-full ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
          <AlertTriangle size={24} className={danger ? 'text-red-500' : 'text-amber-500'} />
        </div>
        <p className="text-sm text-surface-600">{message}</p>
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => { onConfirm(); onClose() }}
            className={`flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}>
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  )
}
