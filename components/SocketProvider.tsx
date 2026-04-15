'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import type { Message, Conversation, ConversationParticipant } from '@/lib/types';

export default function SocketProvider() {
  const token = useStore((s) => s.token);
  const appendMessage = useStore((s) => s.appendMessage);
  const updateMessage = useStore((s) => s.updateMessage);
  const softDeleteMessage = useStore((s) => s.softDeleteMessage);
  const softDeleteMessageById = useStore((s) => s.softDeleteMessageById);
  const upsertConversation = useStore((s) => s.upsertConversation);
  const addParticipant = useStore((s) => s.addParticipant);
  const removeParticipant = useStore((s) => s.removeParticipant);
  const setUserOnline = useStore((s) => s.setUserOnline);
  const setUserOffline = useStore((s) => s.setUserOffline);
  const resetPresence = useStore((s) => s.resetPresence);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    socket.on('connect', () => {
      resetPresence();
    });

    socket.on('connect_error', (err) => {
      if ((err as { message?: string }).message?.includes('Unauthorized')) {
        disconnectSocket();
      }
    });

    // ── Message events ──────────────────────────────────────────────────────
    socket.on('message.created', (msg: Message) => {
      appendMessage(msg.conversationId, msg);
    });

    socket.on('message.updated', (msg: Message) => {
      updateMessage(msg.conversationId, msg);
    });

    // Spec payload: { messageId: string } — no conversationId guaranteed.
    // Backend may include conversationId as a bonus; handle both cases.
    socket.on('message.deleted', (payload: { messageId: string; conversationId?: string }) => {
      if (payload.conversationId) {
        softDeleteMessage(payload.conversationId, payload.messageId);
      } else {
        softDeleteMessageById(payload.messageId);
      }
    });

    // ── Conversation events ─────────────────────────────────────────────────
    socket.on('conversation.updated', (conv: Conversation) => {
      upsertConversation(conv);
    });

    // Backend may include conversationId on participant events; handle both.
    socket.on(
      'conversation.participant_added',
      (p: ConversationParticipant & { conversationId?: string }) => {
        if (p.conversationId) addParticipant(p.conversationId, p);
      },
    );

    socket.on(
      'conversation.participant_removed',
      (payload: { userId: string; conversationId?: string }) => {
        if (payload.conversationId) removeParticipant(payload.conversationId, payload.userId);
      },
    );

    socket.on(
      'conversation.participant_left',
      (payload: { userId: string; conversationId?: string }) => {
        if (payload.conversationId) removeParticipant(payload.conversationId, payload.userId);
      },
    );

    // ── Presence events ─────────────────────────────────────────────────────
    socket.on('user.online', ({ userId }: { userId: string }) => {
      setUserOnline(userId);
    });

    socket.on('user.offline', ({ userId }: { userId: string }) => {
      setUserOffline(userId);
    });

    return () => {
      socket.removeAllListeners();
    };
  }, [token]);

  useEffect(() => {
    if (!token) disconnectSocket();
  }, [token]);

  return null;
}
