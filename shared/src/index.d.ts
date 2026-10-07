export type MessageType = 'text' | 'file' | 'system';
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';
export type RoomStatus = 'active' | 'deleted';
export type ParticipantStatus = 'online' | 'offline';
export interface Room {
    id: string;
    createdAt: number;
    lastActivityAt: number;
    participantCount: number;
    status: RoomStatus;
}
export interface Participant {
    id: string;
    roomId: string;
    sessionId: string;
    displayName: string;
    avatarColor: string;
    joinedAt: number;
    lastHeartbeat: number;
    isConnected: boolean;
}
export interface EncryptedMessage {
    id: string;
    roomId: string;
    senderSessionId: string;
    senderName: string;
    senderAvatarColor: string;
    encryptedContent: string;
    messageType: MessageType;
    createdAt: number;
    fileId?: string;
    encryptedFileName?: string;
    fileSize?: number;
    mimeType?: string;
}
export interface ChatMessage {
    id: string;
    roomId: string;
    senderSessionId: string;
    senderName: string;
    senderAvatarColor: string;
    content: string;
    messageType: MessageType;
    createdAt: number;
    fileId?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    isOwn?: boolean;
    status?: 'sending' | 'sent' | 'error';
}
export interface WsJoinRoomPayload {
    roomId: string;
    sessionId: string;
    displayName: string;
    avatarColor: string;
}
export interface WsLeaveRoomPayload {
    roomId: string;
    sessionId: string;
}
export interface WsSendMessagePayload {
    roomId: string;
    sessionId: string;
    encryptedContent: string;
    messageType: MessageType;
    fileId?: string;
    encryptedFileName?: string;
    fileSize?: number;
    mimeType?: string;
}
export interface WsTypingPayload {
    roomId: string;
    sessionId: string;
    displayName: string;
}
export interface WsHeartbeatPayload {
    roomId: string;
    sessionId: string;
}
export interface CreateRoomResponse {
    roomId: string;
    roomKey: string;
    sessionId: string;
    displayName: string;
    avatarColor: string;
}
export interface JoinRoomRequest {
    roomKey: string;
    displayName?: string;
}
export interface JoinRoomResponse {
    roomId: string;
    sessionId: string;
    displayName: string;
    avatarColor: string;
    participants: Participant[];
}
export interface MessagesResponse {
    messages: EncryptedMessage[];
}
export interface FileUploadResponse {
    fileId: string;
}
export interface ServerToClientEvents {
    'message:new': (msg: EncryptedMessage) => void;
    'message:deleted': (data: {
        messageId: string;
    }) => void;
    'typing:update': (data: {
        typingUsers: {
            sessionId: string;
            displayName: string;
        }[];
    }) => void;
    'presence:update': (data: {
        participants: Participant[];
    }) => void;
    'room:destroyed': (data: {
        reason: string;
    }) => void;
    'room:userJoined': (data: {
        participant: Participant;
    }) => void;
    'room:userLeft': (data: {
        sessionId: string;
        displayName: string;
    }) => void;
    'heartbeat:pong': () => void;
    'error': (data: {
        code: string;
        message: string;
    }) => void;
}
export interface ClientToServerEvents {
    'room:join': (payload: WsJoinRoomPayload) => void;
    'room:leave': (payload: WsLeaveRoomPayload) => void;
    'message:send': (payload: WsSendMessagePayload) => void;
    'typing:start': (payload: WsTypingPayload) => void;
    'typing:stop': (payload: WsTypingPayload) => void;
    'heartbeat:ping': (payload: WsHeartbeatPayload) => void;
}
//# sourceMappingURL=index.d.ts.map