'use client';

import { useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import { useStore, selectMessages } from '@/lib/store';
import { messagesApi } from '@/lib/api';
import { formatDateSeparator, isSameDay, withinGroupWindow } from '@/lib/time';
import MessageBubble from './MessageBubble';
import type { Message, Conversation } from '@/lib/types';

interface Props {
  conversation: Conversation;
  currentUserId: string;
}

export default function MessageFeed({ conversation, currentUserId }: Props) {
  const { items, nextCursor, loading } = useStore(selectMessages(conversation.id));
  const initMessages = useStore((s) => s.initMessages);
  const prependMessages = useStore((s) => s.prependMessages);
  const setMessagesLoading = useStore((s) => s.setMessagesLoading);
  const setReplyingTo = useStore((s) => s.setReplyingTo);
  const setError = useStore((s) => s.setError);

  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const isFetching = useRef(false);

  // Initial load
  useEffect(() => {
    if (items.length > 0) return;
    isInitialLoad.current = true;
    setMessagesLoading(conversation.id, true);
    messagesApi
      .list(conversation.id)
      .then(({ data }) => {
        // API returns newest-first; reverse to display oldest→newest
        const msgs: Message[] = [...data.data].reverse();
        initMessages(conversation.id, msgs, data.nextCursor);
      })
      .catch(() => {
        setError('Failed to load messages.');
        setMessagesLoading(conversation.id, false);
      });
  }, [conversation.id]);

  // Scroll to bottom on initial load or new own message
  useEffect(() => {
    if (isInitialLoad.current && items.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
      isInitialLoad.current = false;
    }
  }, [items.length]);

  // Auto-scroll when new message arrives at bottom
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [items.length]);

  // Infinite scroll — load older messages when scrolled to top
  const handleScroll = useCallback(() => {
    const el = feedRef.current;
    if (!el || isFetching.current || !nextCursor || loading) return;
    if (el.scrollTop < 80) {
      isFetching.current = true;
      const prevScrollHeight = el.scrollHeight;
      setMessagesLoading(conversation.id, true);
      messagesApi
        .list(conversation.id, nextCursor)
        .then(({ data }) => {
          const msgs: Message[] = [...data.data].reverse();
          prependMessages(conversation.id, msgs, data.nextCursor);
          // Restore scroll position after prepend
          requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight - prevScrollHeight;
          });
        })
        .catch(() => {
          setError('Failed to load older messages.');
          setMessagesLoading(conversation.id, false);
        })
        .finally(() => {
          isFetching.current = false;
        });
    }
  }, [nextCursor, loading, conversation.id]);

  if (loading && items.length === 0) {
    return (
      <Box sx={{ flex: 1, px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[0, 1, 2].map((i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="circular" width={32} height={32} sx={{ flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="50%" height={14} />
              <Skeleton variant="rectangular" width="70%" height={36} sx={{ borderRadius: 1, mt: 0.5 }} />
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          No messages yet. Say hello!
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={feedRef}
      onScroll={handleScroll}
      sx={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        py: 1.5,
      }}
    >
      {/* Load more indicator */}
      {loading && items.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <CircularProgress size={20} />
        </Box>
      )}

      <div ref={topRef} />

      {/* Build userId → username map from all known message authors */}
      {(() => {
        const authorMap: Record<string, string> = {};
        for (const p of conversation.participants) {
          authorMap[p.userId] = p.username;
        }
        for (const m of items) {
          authorMap[m.author.id] = m.author.username;
        }

        return items.map((msg, idx) => {
        const prev = items[idx - 1];
        const showDateSep = !prev || !isSameDay(prev.createdAt, msg.createdAt);
        const sameAuthor = prev && prev.authorId === msg.authorId;
        const inWindow = prev && withinGroupWindow(prev.createdAt, msg.createdAt);
        const grouped = sameAuthor && inWindow && !showDateSep;

        return (
          <Box key={msg.id}>
            {showDateSep && (
              <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1 }}>
                <Divider sx={{ flex: 1 }} />
                <Chip
                  label={formatDateSeparator(msg.createdAt)}
                  size="small"
                  sx={{ mx: 1, fontSize: '0.7rem' }}
                />
                <Divider sx={{ flex: 1 }} />
              </Box>
            )}
            <MessageBubble
              message={msg}
              isOwn={msg.authorId === currentUserId}
              showAvatar={!grouped}
              showAuthor={!grouped}
              isGroup={conversation.type === 'group'}
              onReply={setReplyingTo}
              authorMap={authorMap}
            />
          </Box>
        );
      });
      })()}

      <div ref={bottomRef} />
    </Box>
  );
}
