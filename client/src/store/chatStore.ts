import { create } from 'zustand';
import type { ChatMessage, Participant, ConnectionStatus } from '@chatx/shared';

interface RoomSession {
  roomId: string;
  roomKey: string;
  roomName?: string;
  sessionId: string;
  displayName: string;
  avatarColor: string;
}

interface ChatStore {
  // Session
  session: RoomSession | null;
  setSession: (s: RoomSession | null) => void;
  updateDisplayName: (name: string) => void;

  // Messages
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  removeMessage: (id: string) => void;

  // Participants
  participants: Participant[];
  setParticipants: (p: Participant[]) => void;

  // Typing
  typingUsers: { sessionId: string; displayName: string }[];
  setTypingUsers: (users: { sessionId: string; displayName: string }[]) => void;

  // Connection
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (s: ConnectionStatus) => void;

  // UI state
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Notifications
  notifications: { id: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }[];
  addNotification: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeNotification: (id: string) => void;

  // Reset
  resetRoom: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  session: null,
  setSession: (s) => set({ session: s }),
  updateDisplayName: (name) => set((state) => ({
    session: state.session ? { ...state.session, displayName: name } : null,
  })),

  messages: [],
  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, msg],
  })),
  setMessages: (msgs) => set({ messages: msgs }),
  removeMessage: (id) => set((state) => ({
    messages: state.messages.filter((m) => m.id !== id),
  })),

  participants: [],
  setParticipants: (p) => set({ participants: p }),

  typingUsers: [],
  setTypingUsers: (users) => set({ typingUsers: users }),

  connectionStatus: 'disconnected',
  setConnectionStatus: (s) => set({ connectionStatus: s }),

  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'dark',
  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('light', next === 'light');
    return { theme: next };
  }),

  notifications: [],
  addNotification: (message, type = 'info') => {
    const id = crypto.randomUUID();
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }],
    }));
    setTimeout(() => {
      get().removeNotification(id);
    }, 4000);
  },
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),

  resetRoom: () => set({
    session: null,
    messages: [],
    participants: [],
    typingUsers: [],
    connectionStatus: 'disconnected',
  }),
}));
