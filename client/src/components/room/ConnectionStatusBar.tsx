import { AnimatePresence, motion } from 'framer-motion';
import type { ConnectionStatus } from '@chatx/shared';

interface Props {
  status: ConnectionStatus;
}

export function ConnectionStatusBar({ status }: Props) {
  if (status === 'connected') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 36, opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="flex items-center justify-center text-sm font-medium overflow-hidden"
        style={{
          background: status === 'reconnecting'
            ? 'rgba(245,158,11,0.1)'
            : 'rgba(239,68,68,0.1)',
          borderBottom: `1px solid ${status === 'reconnecting'
            ? 'rgba(245,158,11,0.2)'
            : 'rgba(239,68,68,0.2)'}`,
          color: status === 'reconnecting' ? '#fbbf24' : '#f87171',
        }}
      >
        <span className="inline-block w-2 h-2 rounded-full mr-2 animate-pulse"
          style={{ background: status === 'reconnecting' ? '#fbbf24' : '#f87171' }} />
        {status === 'reconnecting'
          ? '🟡 Reconnecting to secure server...'
          : '🔴 Connection lost. Retrying...'}
      </motion.div>
    </AnimatePresence>
  );
}
