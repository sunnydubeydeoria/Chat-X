import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  session: { displayName: string };
}

const EMOJI_QUICK = ['👍', '❤️', '😂', '😮', '🙏', '🔥', '✅', '🎉', '😊', '🤔', '💯', '🎊'];

export function MessageInput({ onSend, onTypingStart, onTypingStop }: Props) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    onTypingStop();
    setShowEmoji(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, onSend, onTypingStop]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    if (e.target.value.trim()) {
      onTypingStart();
    } else {
      onTypingStop();
    }
  };

  const handleEmojiPick = (emoji: string) => {
    setText(prev => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  const handleFileClick = () => {
    document.getElementById('file-upload-input')?.click();
  };

  return (
    <div className="relative">
      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-full mb-2 left-0 card p-3 shadow-glass z-10">
          <div className="flex flex-wrap gap-2">
            {EMOJI_QUICK.map((e) => (
              <button
                key={e}
                onClick={() => handleEmojiPick(e)}
                className="text-xl hover:scale-125 transition-transform p-1"
                aria-label={`Insert ${e}`}
                type="button"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="flex items-end gap-2 rounded-2xl p-2"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        {/* File attachment */}
        <button
          onClick={handleFileClick}
          className="btn-ghost p-2 rounded-xl flex-shrink-0 self-end"
          aria-label="Attach file"
          type="button"
          title="Attach encrypted file"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Emoji button */}
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className="btn-ghost p-2 rounded-xl flex-shrink-0 self-end"
          aria-label="Add emoji"
          type="button"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Text area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={onTypingStop}
          placeholder="Type a message... (Enter to send · Shift+Enter for new line)"
          rows={1}
          className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed py-2"
          style={{
            color: 'var(--text-primary)',
            minHeight: '36px',
            maxHeight: '120px',
          }}
          aria-label="Message input"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="btn-primary p-2.5 rounded-xl flex-shrink-0 self-end transition-all"
          style={{ opacity: text.trim() ? 1 : 0.4 }}
          aria-label="Send message"
          type="button"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>
        🔒 Messages are end-to-end encrypted · Files up to 50 MB
      </p>
    </div>
  );
}
