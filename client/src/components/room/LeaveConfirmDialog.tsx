import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLastParticipant: boolean;
}

export function LeaveConfirmDialog({ open, onClose, onConfirm, isLastParticipant }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="w-full max-w-sm card p-6 shadow-glass"
              role="dialog"
              aria-modal="true"
              aria-labelledby="leave-dialog-title"
            >
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 btn-ghost p-1.5 rounded-lg"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: isLastParticipant ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                  border: `1px solid ${isLastParticipant ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                }}>
                <AlertTriangle className="w-6 h-6"
                  style={{ color: isLastParticipant ? '#f87171' : '#fbbf24' }} />
              </div>

              <h2 id="leave-dialog-title" className="font-bold text-lg mb-2"
                style={{ color: 'var(--text-primary)' }}>
                Leave this room?
              </h2>

              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                {isLastParticipant
                  ? 'You are the last participant. Leaving will permanently destroy this room and all its messages — they cannot be recovered.'
                  : 'You will be disconnected from this chat room. Others will remain in the room.'}
              </p>

              {isLastParticipant && (
                <div className="rounded-xl p-3 mb-4 text-xs"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#f87171',
                  }}>
                  🔒 Room data will be permanently deleted. This action cannot be undone.
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="btn-ghost flex-1 py-2.5 px-4 rounded-xl text-sm font-medium"
                >
                  Stay in Room
                </button>
                <button
                  onClick={() => { onConfirm(); onClose(); }}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{
                    background: isLastParticipant
                      ? 'linear-gradient(135deg, #dc2626, #ef4444)'
                      : 'linear-gradient(135deg, #d97706, #f59e0b)',
                  }}
                >
                  {isLastParticipant ? 'Destroy & Leave' : 'Leave Room'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
