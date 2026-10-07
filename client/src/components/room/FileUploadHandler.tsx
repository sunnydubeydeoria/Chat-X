import { useRef, useCallback } from 'react';
import { Paperclip } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { getRoomKeys, encryptFile } from '../../lib/crypto/e2ee';
import { formatFileSize } from '../../lib/utils';
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from '@chatx/shared/constants';
import { getSocket } from '../../lib/socket/socketClient';
import type { WsSendMessagePayload } from '@chatx/shared';

interface Props {
  roomId: string;
  session: { roomId: string; sessionId: string; roomKey: string; displayName: string; avatarColor: string };
}

export function FileUploadHandler({ roomId, session }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addNotification, addMessage } = useChatStore();

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      addNotification(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE_BYTES)}.`, 'error');
      return;
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      addNotification('File type not allowed.', 'error');
      return;
    }

    try {
      addNotification(`Encrypting ${file.name}...`, 'info');

      // Read file
      const arrayBuffer = await file.arrayBuffer();

      // Encrypt file
      const { fileKey } = await getRoomKeys(session.roomKey);
      const { encryptedBlob, encryptedName } = await encryptFile(arrayBuffer, file.name, fileKey);

      addNotification('Uploading encrypted file...', 'info');

      // Upload encrypted blob
      const formData = new FormData();
      formData.append('file', encryptedBlob, 'encrypted.enc');
      formData.append('encryptedFileName', encryptedName);
      formData.append('mimeType', file.type);

      const res = await fetch(`/api/files/${roomId}`, {
        method: 'POST',
        headers: { 'x-session-id': session.sessionId },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const { fileId } = await res.json();

      // Send file message via socket
      const { msgKey } = await getRoomKeys(session.roomKey);
      const { encryptMessage } = await import('../../lib/crypto/e2ee');
      const encryptedContent = await encryptMessage(`[File: ${file.name}]`, msgKey);

      const socket = getSocket();
      const payload: WsSendMessagePayload = {
        roomId,
        sessionId: session.sessionId,
        encryptedContent,
        messageType: 'file',
        fileId,
        encryptedFileName: encryptedName,
        fileSize: file.size,
        mimeType: file.type,
      };
      socket.emit('message:send', payload);

      addNotification(`${file.name} uploaded successfully!`, 'success');
    } catch (err: any) {
      console.error('File upload error:', err);
      addNotification(err.message || 'File upload failed. Please try again.', 'error');
    }
  }, [roomId, session, addNotification]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ALLOWED_MIME_TYPES.join(',')}
        onChange={handleFileSelect}
        aria-label="Upload file"
        id="file-upload-input"
      />
      {/* This component renders nothing visible — the trigger is the label */}
      <label
        htmlFor="file-upload-input"
        className="hidden" // Hidden — triggered programmatically or via label elsewhere
      />
    </>
  );
}

// Export trigger function for use in MessageInput
export function triggerFileUpload() {
  document.getElementById('file-upload-input')?.click();
}
