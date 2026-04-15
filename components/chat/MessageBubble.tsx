'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ReplyOutlined from '@mui/icons-material/ReplyOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import { formatMessageTime } from '@/lib/time';
import { messagesApi } from '@/lib/api';
import { useStore } from '@/lib/store';
import ReplyPreview from './ReplyPreview';
import type { Message } from '@/lib/types';

interface Props {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  showAuthor: boolean;
  isGroup: boolean;
  onReply: (msg: Message) => void;
  /** Map of userId → username for resolving reply-preview author names */
  authorMap: Record<string, string>;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export default function MessageBubble({ message, isOwn, showAvatar, showAuthor, isGroup, onReply, authorMap }: Props) {
  const updateMessage = useStore((s) => s.updateMessage);
  const softDeleteMessage = useStore((s) => s.softDeleteMessage);
  const setError = useStore((s) => s.setError);

  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isDeleted = Boolean(message.deletedAt);

  async function handleEdit() {
    if (!editContent.trim() || editContent === message.content) {
      setEditing(false);
      return;
    }
    try {
      const { data } = await messagesApi.edit(message.conversationId, message.id, editContent.trim());
      updateMessage(message.conversationId, data);
    } catch {
      setError('Failed to edit message.');
    }
    setEditing(false);
  }

  async function handleDelete() {
    try {
      await messagesApi.delete(message.conversationId, message.id);
      softDeleteMessage(message.conversationId, message.id);
    } catch {
      setError('Failed to delete message.');
    }
  }

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        px: 2,
        py: 0.25,
        position: 'relative',
        '&:hover .msg-actions': { opacity: 1 },
      }}
    >
      {/* Avatar column — always reserve space */}
      <Box sx={{ width: 32, flexShrink: 0, mt: 0.5 }}>
        {showAvatar && (
          <Avatar
            sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.7rem', fontWeight: 600 }}
          >
            {getInitials(message.author.username)}
          </Avatar>
        )}
      </Box>

      {/* Message block */}
      <Box sx={{ flex: 1, minWidth: 0, maxWidth: '75%' }}>
        {/* Author name (group only, first in group) */}
        {isGroup && showAuthor && !isDeleted && (
          <Typography variant="caption" fontWeight={600} color="text.secondary" display="block" sx={{ mb: 0.25 }}>
            {message.author.username}
          </Typography>
        )}

        {/* Reply preview */}
        {message.replyTo && !isDeleted && (
          <Box sx={{ mb: 0.5 }}>
            <ReplyPreview
              authorName={authorMap[message.replyTo.authorId] ?? message.replyTo.authorId}
              content={message.replyTo.content}
            />
          </Box>
        )}

        {/* Bubble */}
        {editing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <TextField
              variant="standard"
              size="small"
              fullWidth
              multiline
              maxRows={4}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); }
                if (e.key === 'Escape') { setEditing(false); setEditContent(message.content); }
              }}
              autoFocus
              slotProps={{ input: { disableUnderline: false } }}
            />
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button size="small" variant="contained" onClick={handleEdit} sx={{ fontSize: '0.7rem', py: 0.25 }}>
                Save
              </Button>
              <Button size="small" variant="outlined" color="inherit" onClick={() => { setEditing(false); setEditContent(message.content); }} sx={{ fontSize: '0.7rem', py: 0.25 }}>
                Cancel
              </Button>
            </Box>
          </Box>
        ) : isDeleted ? (
          <Typography
            variant="caption"
            fontStyle="italic"
            color="text.disabled"
            sx={{ display: 'block' }}
          >
            Message deleted
          </Typography>
        ) : (
          <Paper
            elevation={0}
            sx={{
              display: 'inline-block',
              maxWidth: '100%',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              px: 1.5,
              py: 0.75,
              bgcolor: isOwn ? (theme) => alpha(theme.palette.primary.main, 0.1) : 'background.paper',
              ml: isOwn ? 'auto' : 0,
            }}
          >
            <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Typography>
          </Paper>
        )}

        {/* Timestamp + edited */}
        {!isDeleted && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
            <Typography variant="caption" color="text.disabled">
              {formatMessageTime(message.createdAt)}
            </Typography>
            {message.editedAt && (
              <Typography variant="caption" color="text.disabled">
                (edited)
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Hover actions */}
      {!isDeleted && !editing && (
        <Box
          className="msg-actions"
          sx={{
            position: 'absolute',
            top: -4,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            px: 0.5,
            opacity: 0,
            transition: 'opacity 0.15s',
            zIndex: 1,
          }}
        >
          <Tooltip title="Reply">
            <IconButton size="small" onClick={() => onReply(message)}>
              <ReplyOutlined sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          {isOwn && (
            <>
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => { setEditing(true); setEditContent(message.content); }}>
                  <EditOutlined sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" onClick={handleDelete} sx={{ color: 'error.main' }}>
                  <DeleteOutlined sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
