import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';

export function TypingIndicator() {
  const typingUsers = useChatStore((s) => s.typingUsers);
  const session = useChatStore((s) => s.session);

  const otherTypingUsers = typingUsers.filter((u) => u.sessionId !== session?.sessionId);

  if (otherTypingUsers.length === 0) return null;

  const label = otherTypingUsers.length === 1
    ? `${otherTypingUsers[0].displayName} is typing`
    : otherTypingUsers.length === 2
    ? `${otherTypingUsers[0].displayName} and ${otherTypingUsers[1].displayName} are typing`
    : `${otherTypingUsers.length} people are typing`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="px-4 pb-1"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-2 rounded-2xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <span className="typing-dot animate-typing-dot inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--text-muted)' }} />
            <span className="typing-dot animate-typing-dot inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--text-muted)' }} />
            <span className="typing-dot animate-typing-dot inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--text-muted)' }} />
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}...</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
