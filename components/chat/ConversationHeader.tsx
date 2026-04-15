'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreVertOutlined from '@mui/icons-material/MoreVertOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import { alpha } from '@mui/material/styles';
import { useStore, selectOnline } from '@/lib/store';
import { participantsApi } from '@/lib/api';
import { formatLastSeen } from '@/lib/time';
import type { Conversation, User } from '@/lib/types';
import MembersDialog from './MembersDialog';
import InviteDialog from './InviteDialog';
import EditGroupDialog from './EditGroupDialog';

interface Props {
  conversation: Conversation;
  currentUser: User;
}

function DirectStatus({ otherUserId, lastSeen }: { otherUserId: string; lastSeen: string | null }) {
  const online = useStore(selectOnline(otherUserId));
  return (
    <Typography
      variant="caption"
      sx={{ color: online ? 'success.main' : 'text.secondary' }}
    >
      {online ? 'Online' : `Last seen ${formatLastSeen(lastSeen)}`}
    </Typography>
  );
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

export default function ConversationHeader({ conversation, currentUser }: Props) {
  const router = useRouter();
  const removeConversation = useStore((s) => s.removeConversation);
  const setError = useStore((s) => s.setError);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const myRole = conversation.participants.find((p) => p.userId === currentUser.id)?.role;
  const isAdminOrOwner = myRole === 'OWNER' || myRole === 'ADMIN';

  let displayName = '';
  let otherUserId: string | null = null;
  let otherLastSeen: string | null = null;

  if (conversation.type === 'direct') {
    const other = conversation.participants.find((p) => p.userId !== currentUser.id);
    displayName = other?.user?.username ?? 'Unknown';
    otherUserId = other?.userId ?? null;
    // lastSeen comes from presence events; not stored on participant
    otherLastSeen = null;
  } else {
    displayName = conversation.name ?? 'Unnamed group';
  }

  async function handleLeave() {
    setAnchorEl(null);
    try {
      await participantsApi.leave(conversation.id);
      removeConversation(conversation.id);
      router.push('/chat');
    } catch {
      setError('Failed to leave conversation.');
    }
  }

  return (
    <>
      <Box
        sx={{
          height: 56,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        {/* Avatar */}
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.75rem', fontWeight: 600 }}>
          {conversation.type === 'group' ? <GroupOutlined sx={{ fontSize: 16 }} /> : getInitials(displayName)}
        </Avatar>

        {/* Name + status */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {displayName}
          </Typography>
          {conversation.type === 'direct' && otherUserId ? (
            <DirectStatus otherUserId={otherUserId} lastSeen={otherLastSeen} />
          ) : (
            <Typography variant="caption" color="text.secondary">
              {conversation.participants.length} members
            </Typography>
          )}
        </Box>

        {/* Actions menu */}
        <Tooltip title="Options">
          <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreVertOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { minWidth: 180 } } }}
      >
        <MenuItem onClick={() => { setAnchorEl(null); setMembersOpen(true); }}>
          View members
        </MenuItem>
        {isAdminOrOwner && conversation.type === 'group' && (
          <MenuItem onClick={() => { setAnchorEl(null); setInviteOpen(true); }}>
            Invite people
          </MenuItem>
        )}
        {isAdminOrOwner && conversation.type === 'group' && (
          <MenuItem onClick={() => { setAnchorEl(null); setEditOpen(true); }}>
            Edit group
          </MenuItem>
        )}
        <MenuItem onClick={handleLeave} sx={{ color: 'error.main' }}>
          Leave
        </MenuItem>
      </Menu>

      <MembersDialog
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        conversation={conversation}
        currentUser={currentUser}
        isAdminOrOwner={isAdminOrOwner ?? false}
      />

      {isAdminOrOwner && conversation.type === 'group' && (
        <>
          <InviteDialog
            open={inviteOpen}
            onClose={() => setInviteOpen(false)}
            conversationId={conversation.id}
          />
          <EditGroupDialog
            open={editOpen}
            onClose={() => setEditOpen(false)}
            conversation={conversation}
          />
        </>
      )}
    </>
  );
}
