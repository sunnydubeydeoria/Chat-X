import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Download, File, Image as ImageIcon } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '@chatx/shared';

export function MessageList() {
  const messages = useChatStore((s) => s.messages);
  const session = useChatStore((s) => s.session);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const isAtBottomRef = useRef(true);
  const prevMsgCountRef = useRef(messages.length);

  // Auto-scroll logic
  useEffect(() => {
    if (messages.length !== prevMsgCountRef.current) {
      const added = messages.length - prevMsgCountRef.current;
      prevMsgCountRef.current = messages.length;

      if (isAtBottomRef.current) {
        scrollToBottom('smooth');
        setNewMsgCount(0);
      } else {
        // Count new messages from others
        const lastNew = messages.slice(-added);
        const othersNew = lastNew.filter(m => m.senderSessionId !== session?.sessionId).length;
        if (othersNew > 0) {
          setNewMsgCount(prev => prev + othersNew);
        }
      }
    }
  }, [messages, session]);

  function scrollToBottom(behavior: ScrollBehavior = 'instant') {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
  }

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distFromBottom < 100;
    setShowScrollButton(distFromBottom > 200);
    if (isAtBottomRef.current) setNewMsgCount(0);
  }

  const handleScrollToBottom = () => {
    scrollToBottom('smooth');
    setNewMsgCount(0);
  };

  // Group consecutive messages from same sender
  function groupMessages(msgs: ChatMessage[]) {
    const groups: { msgs: ChatMessage[]; key: string }[] = [];
    let currentGroup: ChatMessage[] = [];
    let currentSender = '';

    for (const msg of msgs) {
      if (msg.messageType === 'system') {
        if (currentGroup.length > 0) {
          groups.push({ msgs: currentGroup, key: currentGroup[0].id });
          currentGroup = [];
          currentSender = '';
        }
        groups.push({ msgs: [msg], key: msg.id });
      } else if (msg.senderSessionId === currentSender &&
        msg.createdAt - currentGroup[currentGroup.length - 1].createdAt < 5 * 60 * 1000) {
        currentGroup.push(msg);
      } else {
        if (currentGroup.length > 0) {
          groups.push({ msgs: currentGroup, key: currentGroup[0].id });
        }
        currentGroup = [msg];
        currentSender = msg.senderSessionId;
      }
    }
    if (currentGroup.length > 0) {
      groups.push({ msgs: currentGroup, key: currentGroup[0].id });
    }
    return groups;
  }

  const groups = groupMessages(messages);

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-4 space-y-1"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10
              border border-indigo-500/10 flex items-center justify-center mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              End-to-End Encrypted
            </h3>
            <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>
              Messages are encrypted in your browser. Say hello to start the conversation!
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {groups.map(({ msgs, key }) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageBubble
                messages={msgs}
                isOwn={msgs[0].senderSessionId === session?.sessionId}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={bottomRef} className="h-px" />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={handleScrollToBottom}
            className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-full
              text-sm font-medium shadow-lg transition-all"
            style={{
              background: 'var(--accent)',
              color: 'white',
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
            }}
          >
            {newMsgCount > 0 && (
              <span className="bg-white text-indigo-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {newMsgCount}
              </span>
            )}
            <ChevronDown className="w-4 h-4" />
            {newMsgCount > 0 && <span className="hidden sm:inline">New messages</span>}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
