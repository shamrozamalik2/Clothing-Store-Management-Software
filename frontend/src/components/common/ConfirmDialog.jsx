import Modal from './Modal';
import Button from '@components/ui/Button';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cn } from '@utils/cn';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm" hideClose>
      <Modal.Body className="text-center py-6">
        <div className={cn(
          'inline-flex h-12 w-12 rounded-full items-center justify-center mb-4',
          variant === 'danger' ? 'bg-red-900/40' : 'bg-amber-900/40'
        )}>
          <ExclamationTriangleIcon className={cn(
            'h-6 w-6',
            variant === 'danger' ? 'text-red-400' : 'text-amber-400'
          )} />
        </div>
        <p className="text-base font-semibold text-surface-100">{title}</p>
        {message && <p className="mt-2 text-sm text-surface-400">{message}</p>}
      </Modal.Body>
      <Modal.Footer className="justify-center gap-3">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
