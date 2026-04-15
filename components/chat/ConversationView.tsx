'use client';

import { useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useStore, selectActiveConversation } from '@/lib/store';
import { conversationsApi } from '@/lib/api';
import ConversationHeader from './ConversationHeader';
import MessageFeed from './MessageFeed';
import MessageInput from './MessageInput';

interface Props {
  conversationId: string;
}

export default function ConversationView({ conversationId }: Props) {
  const setActiveConversationId = useStore((s) => s.setActiveConversationId);
  const upsertConversation = useStore((s) => s.upsertConversation);
  const conversation = useStore((s) =>
    s.conversations.find((c) => c.id === conversationId) ?? null,
  );
  const currentUser = useStore((s) => s.currentUser);
  const setError = useStore((s) => s.setError);

  useEffect(() => {
    setActiveConversationId(conversationId);
    // Fetch full conversation details if not in store yet (participants required)
    if (!conversation) {
      conversationsApi
        .get(conversationId)
        .then(({ data }) => upsertConversation(data))
        .catch(() => setError('Failed to load conversation.'));
    }
    return () => setActiveConversationId(null);
  }, [conversationId]);

  if (!conversation || !currentUser) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.disabled">
          Loading…
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <ConversationHeader conversation={conversation} currentUser={currentUser} />
      <MessageFeed conversation={conversation} currentUserId={currentUser.id} />
      <MessageInput conversationId={conversationId} />
    </Box>
  );
}
