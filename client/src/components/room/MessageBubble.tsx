import { useState } from 'react';
import { Download, File, Image as ImageIcon, FileText, Archive, Copy, Check } from 'lucide-react';
import { formatTime, formatFileSize, isImageMime, linkify, getInitials } from '../../lib/utils';
import type { ChatMessage } from '@chatx/shared';

interface Props {
  messages: ChatMessage[];
  isOwn: boolean;
}

export function MessageBubble({ messages, isOwn }: Props) {
  const first = messages[0];

  // System message
  if (first.messageType === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs px-3 py-1 rounded-full"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}>
          {first.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar — only show for others */}
      {!isOwn && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-auto"
          style={{ background: first.senderAvatarColor, boxShadow: `0 0 0 2px ${first.senderAvatarColor}30` }}
          title={first.senderName}
        >
          {getInitials(first.senderName)}
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-sm lg:max-w-lg ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Name + time (shown above first message in group) */}
        {!isOwn && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-semibold" style={{ color: first.senderAvatarColor }}>
              {first.senderName}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatTime(first.createdAt)}
            </span>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, i) => (
          <MessageContent
            key={msg.id}
            msg={msg}
            isOwn={isOwn}
            isLast={i === messages.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function MessageContent({ msg, isOwn, isLast }: { msg: ChatMessage; isOwn: boolean; isLast: boolean }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = async () => {
    if (!msg.fileId || downloading) return;
    setDownloading(true);
    setDownloadProgress(0);

    try {
      const { useChatStore } = await import('../../store/chatStore');
      const session = useChatStore.getState().session;
      if (!session) return;

      const { getRoomKeys, decryptFile } = await import('../../lib/crypto/e2ee');
      const { fileKey } = await getRoomKeys(session.roomKey);

      const res = await fetch(`/api/files/${msg.roomId}/${msg.fileId}`, {
        headers: { 'x-session-id': session.sessionId },
      });

      if (!res.ok) throw new Error('Download failed');

      const reader = res.body?.getReader();
      const contentLength = parseInt(res.headers.get('content-length') || '0');
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (contentLength > 0) setDownloadProgress(Math.round((received / contentLength) * 100));
      }

      const encryptedData = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
      let offset = 0;
      for (const chunk of chunks) { encryptedData.set(chunk, offset); offset += chunk.length; }

      const decrypted = await decryptFile(encryptedData.buffer, fileKey);

      // Trigger download
      const blob = new Blob([decrypted], { type: msg.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = msg.fileName || 'file';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  if (msg.messageType === 'file') {
    return (
      <div
        className="rounded-2xl p-3 group cursor-pointer"
        style={{
          background: isOwn ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'var(--bg-elevated)',
          border: isOwn ? 'none' : '1px solid var(--border)',
          minWidth: '220px',
        }}
        onClick={handleDownloadFile}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: isOwn ? 'rgba(255,255,255,0.15)' : 'var(--bg-card)' }}>
            {msg.mimeType?.startsWith('image/') ? (
              <ImageIcon className="w-5 h-5" style={{ color: isOwn ? 'white' : '#818cf8' }} />
            ) : msg.mimeType?.includes('pdf') ? (
              <FileText className="w-5 h-5" style={{ color: isOwn ? 'white' : '#f87171' }} />
            ) : msg.mimeType?.includes('zip') ? (
              <Archive className="w-5 h-5" style={{ color: isOwn ? 'white' : '#fbbf24' }} />
            ) : (
              <File className="w-5 h-5" style={{ color: isOwn ? 'white' : '#60a5fa' }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: isOwn ? 'white' : 'var(--text-primary)' }}>
              {msg.fileName || 'Encrypted file'}
            </p>
            <p className="text-xs" style={{ color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
              {msg.fileSize ? formatFileSize(msg.fileSize) : ''}
              {msg.mimeType ? ` · ${msg.mimeType.split('/')[1]?.toUpperCase() || ''}` : ''}
            </p>
          </div>
          {downloading ? (
            <div className="flex-shrink-0 w-6 h-6">
              <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          ) : (
            <Download className="w-5 h-5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
              style={{ color: isOwn ? 'white' : 'var(--text-secondary)' }} />
          )}
        </div>
        {downloading && downloadProgress > 0 && (
          <div className="mt-2 h-1 rounded-full overflow-hidden"
            style={{ background: isOwn ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${downloadProgress}%`,
                background: isOwn ? 'white' : 'var(--accent)',
              }}
            />
          </div>
        )}
        {isLast && (
          <p className="text-xs mt-1 text-right" style={{ color: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)' }}>
            {formatTime(msg.createdAt)}
          </p>
        )}
      </div>
    );
  }

  // Text message
  return (
    <div className="group relative">
      <div
        className="px-4 py-2.5 rounded-2xl break-words"
        style={isOwn
          ? { background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white',
              borderRadius: '18px 18px 4px 18px' }
          : { background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', borderRadius: '18px 18px 18px 4px' }
        }
      >
        <p
          className="text-sm leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: linkify(msg.content) }}
        />
        {isLast && (
          <p className="text-xs mt-1 text-right"
            style={{ color: isOwn ? 'rgba(255,255,255,0.55)' : 'var(--text-muted)' }}>
            {formatTime(msg.createdAt)}
          </p>
        )}
      </div>

      {/* Copy button on hover */}
      <button
        onClick={handleCopy}
        className="absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity
          p-1.5 rounded-lg"
        style={{
          right: isOwn ? 'calc(100% + 4px)' : undefined,
          left: isOwn ? undefined : 'calc(100% + 4px)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
        }}
        aria-label="Copy message"
      >
        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />}
      </button>
    </div>
  );
}
