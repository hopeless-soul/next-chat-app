'use client';

import { useState, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import SendOutlined from '@mui/icons-material/SendOutlined';
import { messagesApi, getErrorMessage } from '@/lib/api';
import { useStore } from '@/lib/store';
import ReplyPreview from './ReplyPreview';

interface Props {
  conversationId: string;
}

export default function MessageInput({ conversationId }: Props) {
  const replyingTo = useStore((s) => s.replyingTo);
  const setReplyingTo = useStore((s) => s.setReplyingTo);
  const appendMessage = useStore((s) => s.appendMessage);
  const setError = useStore((s) => s.setError);

  const [content, setContent] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState('');
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const send = useCallback(async () => {
    const text = content.trim();
    if (!text || disabled) return;

    setContent('');
    const replyId = replyingTo?.id;
    setReplyingTo(null);

    try {
      const { data } = await messagesApi.send(conversationId, text, replyId);
      appendMessage(conversationId, data);
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 429) {
        setDisabled(true);
        setRateLimitMsg('Slow down…');
        cooldownRef.current = setTimeout(() => {
          setDisabled(false);
          setRateLimitMsg('');
        }, 5000);
      } else {
        setError(getErrorMessage(err, 'Failed to send message.'));
        // Restore text on failure
        setContent(text);
      }
    }
  }, [content, disabled, replyingTo, conversationId]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const replyAuthor = replyingTo?.author.username ?? '';

  return (
    <Box
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        px: 2,
        py: 1.5,
        flexShrink: 0,
      }}
    >
      {/* Reply strip */}
      {replyingTo && (
        <Box sx={{ mb: 1 }}>
          <ReplyPreview
            authorName={replyAuthor}
            content={replyingTo.content}
            onDismiss={() => setReplyingTo(null)}
          />
        </Box>
      )}

      {/* Input row */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        <TextField
          variant="standard"
          fullWidth
          multiline
          maxRows={4}
          placeholder="Message…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          slotProps={{ input: { disableUnderline: true } }}
          sx={{ flex: 1 }}
        />
        <Tooltip title="Send (Enter)">
          <span>
            <IconButton
              color="primary"
              onClick={send}
              disabled={!content.trim() || disabled}
              size="small"
            >
              <SendOutlined fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {rateLimitMsg && (
        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
          {rateLimitMsg}
        </Typography>
      )}
    </Box>
  );
}
