import { create } from 'zustand';
import type {
  User,
  Conversation,
  ConversationParticipant,
  Message,
} from './types';

interface MessagesSlice {
  items: Message[];
  nextCursor: string | null;
  loading: boolean;
}

interface Store {
  // ── Auth ──────────────────────────────────────────────
  token: string | null;
  currentUser: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;

  // ── Conversations ──────────────────────────────────────
  conversations: Conversation[];
  activeConversationId: string | null;
  setConversations: (list: Conversation[]) => void;
  upsertConversation: (conv: Conversation) => void;
  removeConversation: (id: string) => void;
  addParticipant: (convId: string, p: ConversationParticipant) => void;
  removeParticipant: (convId: string, userId: string) => void;
  setActiveConversationId: (id: string | null) => void;

  // ── Messages ───────────────────────────────────────────
  messagesByConvId: Record<string, MessagesSlice>;
  initMessages: (convId: string, items: Message[], cursor: string | null) => void;
  prependMessages: (convId: string, items: Message[], cursor: string | null) => void;
  appendMessage: (convId: string, msg: Message) => void;
  updateMessage: (convId: string, msg: Message) => void;
  softDeleteMessage: (convId: string, messageId: string) => void;
  setMessagesLoading: (convId: string, loading: boolean) => void;

  // ── Presence ───────────────────────────────────────────
  onlineUsers: Set<string>;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  resetPresence: () => void;

  // ── UI ─────────────────────────────────────────────────
  errorMessage: string | null;
  setError: (msg: string | null) => void;

  // ── Reply ──────────────────────────────────────────────
  replyingTo: Message | null;
  setReplyingTo: (msg: Message | null) => void;

  // ── Helpers ────────────────────────────────────────────
  // Soft-delete by messageId across all conversations (for socket events without conversationId)
  softDeleteMessageById: (messageId: string) => void;
}

export const useStore = create<Store>((set) => ({
  // ── Auth ──────────────────────────────────────────────
  token: null,
  currentUser: null,
  setAuth: (token, user) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('accessToken', token);
    }
    set({ token, currentUser: user });
  },
  clearAuth: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('accessToken');
    }
    set({ token: null, currentUser: null, conversations: [], messagesByConvId: {}, onlineUsers: new Set() });
  },

  // ── Conversations ──────────────────────────────────────
  conversations: [],
  activeConversationId: null,
  setConversations: (list) => set({ conversations: list }),
  upsertConversation: (conv) =>
    set((s) => {
      const idx = s.conversations.findIndex((c) => c.id === conv.id);
      if (idx === -1) return { conversations: [conv, ...s.conversations] };
      const next = [...s.conversations];
      next[idx] = conv;
      return { conversations: next };
    }),
  removeConversation: (id) =>
    set((s) => ({ conversations: s.conversations.filter((c) => c.id !== id) })),
  addParticipant: (convId, p) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId ? { ...c, participants: [...c.participants, p] } : c,
      ),
    })),
  removeParticipant: (convId, userId) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId
          ? { ...c, participants: c.participants.filter((p) => p.userId !== userId) }
          : c,
      ),
    })),
  setActiveConversationId: (id) => set({ activeConversationId: id }),

  // ── Messages ───────────────────────────────────────────
  messagesByConvId: {},
  initMessages: (convId, items, cursor) =>
    set((s) => ({
      messagesByConvId: {
        ...s.messagesByConvId,
        [convId]: { items, nextCursor: cursor, loading: false },
      },
    })),
  prependMessages: (convId, items, cursor) =>
    set((s) => {
      const existing = s.messagesByConvId[convId] ?? { items: [], nextCursor: null, loading: false };
      const existingIds = new Set(existing.items.map((m) => m.id));
      const newItems = items.filter((m) => !existingIds.has(m.id));
      return {
        messagesByConvId: {
          ...s.messagesByConvId,
          [convId]: {
            items: [...newItems, ...existing.items],
            nextCursor: cursor,
            loading: false,
          },
        },
      };
    }),
  appendMessage: (convId, msg) =>
    set((s) => {
      const existing = s.messagesByConvId[convId] ?? { items: [], nextCursor: null, loading: false };
      // Deduplicate
      if (existing.items.some((m) => m.id === msg.id)) return s;
      return {
        messagesByConvId: {
          ...s.messagesByConvId,
          [convId]: { ...existing, items: [...existing.items, msg] },
        },
      };
    }),
  updateMessage: (convId, msg) =>
    set((s) => {
      const existing = s.messagesByConvId[convId];
      if (!existing) return s;
      return {
        messagesByConvId: {
          ...s.messagesByConvId,
          [convId]: {
            ...existing,
            items: existing.items.map((m) => (m.id === msg.id ? msg : m)),
          },
        },
      };
    }),
  softDeleteMessage: (convId, messageId) =>
    set((s) => {
      const existing = s.messagesByConvId[convId];
      if (!existing) return s;
      return {
        messagesByConvId: {
          ...s.messagesByConvId,
          [convId]: {
            ...existing,
            items: existing.items.map((m) =>
              m.id === messageId ? { ...m, deletedAt: new Date().toISOString() } : m,
            ),
          },
        },
      };
    }),
  setMessagesLoading: (convId, loading) =>
    set((s) => ({
      messagesByConvId: {
        ...s.messagesByConvId,
        [convId]: { ...(s.messagesByConvId[convId] ?? { items: [], nextCursor: null }), loading },
      },
    })),

  softDeleteMessageById: (messageId) =>
    set((s) => {
      const next: Record<string, MessagesSlice> = {};
      for (const [convId, slice] of Object.entries(s.messagesByConvId)) {
        const idx = slice.items.findIndex((m) => m.id === messageId);
        if (idx !== -1) {
          const items = [...slice.items];
          items[idx] = { ...items[idx], deletedAt: new Date().toISOString() };
          next[convId] = { ...slice, items };
        } else {
          next[convId] = slice;
        }
      }
      return { messagesByConvId: next };
    }),

  // ── Presence ───────────────────────────────────────────
  onlineUsers: new Set(),
  setUserOnline: (userId) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      next.add(userId);
      return { onlineUsers: next };
    }),
  setUserOffline: (userId) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),
  resetPresence: () => set({ onlineUsers: new Set() }),

  // ── UI ─────────────────────────────────────────────────
  errorMessage: null,
  setError: (msg) => set({ errorMessage: msg }),

  // ── Reply ──────────────────────────────────────────────
  replyingTo: null,
  setReplyingTo: (msg) => set({ replyingTo: msg }),
}));

// Selectors
export const selectToken = (s: Store) => s.token;
export const selectCurrentUser = (s: Store) => s.currentUser;
export const selectConversations = (s: Store) => s.conversations;
export const selectActiveConversation = (s: Store) =>
  s.conversations.find((c) => c.id === s.activeConversationId) ?? null;
export const selectMessages = (convId: string) => (s: Store) =>
  s.messagesByConvId[convId] ?? { items: [], nextCursor: null, loading: false };
export const selectOnline = (userId: string) => (s: Store) => s.onlineUsers.has(userId);
