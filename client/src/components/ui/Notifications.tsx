import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertCircle,
  info:    Info,
};

const COLORS = {
  success: { bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)',  text: '#4ade80' },
  error:   { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)',  text: '#f87171' },
  warning: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: '#fbbf24' },
  info:    { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)', text: '#818cf8' },
};

export function Notifications() {
  const notifications = useChatStore((s) => s.notifications);
  const removeNotification = useChatStore((s) => s.removeNotification);

  return (
    <div className="toast flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => {
          const Icon = ICONS[notif.type];
          const colors = COLORS[notif.type];
          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl pointer-events-auto max-w-sm"
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${colors.border}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: colors.text }} />
              <p className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{notif.message}</p>
              <button
                onClick={() => removeNotification(notif.id)}
                className="btn-ghost p-1 rounded-lg flex-shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
