'use client';

import { useRouter } from 'next/navigation';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import { alpha } from '@mui/material/styles';
import { useStore, selectOnline } from '@/lib/store';
import type { Conversation } from '@/lib/types';

interface Props {
  conversation: Conversation;
  currentUserId: string;
  active: boolean;
}

function getDisplayName(conv: Conversation, currentUserId: string): string {
  if (conv.type === 'group') return conv.name ?? 'Unnamed group';
  const other = conv.participants.find((p) => p.userId !== currentUserId);
  return other?.username ?? 'Unknown';
}

function getOtherUserId(conv: Conversation, currentUserId: string): string | null {
  if (conv.type !== 'direct') return null;
  return conv.participants.find((p) => p.userId !== currentUserId)?.userId ?? null;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

interface PresenceDotProps {
  userId: string | null;
}

function PresenceDot({ userId }: PresenceDotProps) {
  const online = useStore(userId ? selectOnline(userId) : () => false);
  if (!userId) return null;
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: '50%',
        bgcolor: online ? 'success.main' : 'text.disabled',
        border: '2px solid',
        borderColor: 'background.default',
        transition: 'background-color 0.3s',
      }}
    />
  );
}

export default function ConversationItem({ conversation, currentUserId, active }: Props) {
  const router = useRouter();
  const displayName = getDisplayName(conversation, currentUserId);
  const otherUserId = getOtherUserId(conversation, currentUserId);
  const initials = getInitials(displayName);

  return (
    <ListItem disablePadding>
      <ListItemButton
        onClick={() => router.push(`/chat/${conversation.id}`)}
        sx={{
          px: 2,
          py: 1,
          borderLeft: active ? '3px solid' : '3px solid transparent',
          borderColor: active ? 'primary.main' : 'transparent',
          bgcolor: active ? (theme) => alpha(theme.palette.primary.main, 0.12) : 'transparent',
          '&:hover': { bgcolor: (theme) => active ? alpha(theme.palette.primary.main, 0.14) : 'action.hover' },
          transition: 'background-color 0.15s, border-color 0.15s',
        }}
      >
        <ListItemAvatar sx={{ minWidth: 48 }}>
          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              {conversation.type === 'group' ? (
                <GroupOutlined fontSize="small" />
              ) : (
                initials
              )}
            </Avatar>
            <PresenceDot userId={otherUserId} />
          </Box>
        </ListItemAvatar>

        <ListItemText
          primary={
            <Typography variant="body2" fontWeight={600} noWrap>
              {displayName}
            </Typography>
          }
          secondary={
            <Typography variant="caption" color="text.disabled" component="span">
              {conversation.type === 'direct' ? 'Direct' : 'Group'}
            </Typography>
          }
          sx={{ m: 0 }}
        />
      </ListItemButton>
    </ListItem>
  );
}
