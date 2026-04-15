'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import PersonRemoveOutlined from '@mui/icons-material/PersonRemoveOutlined';
import { useStore } from '@/lib/store';
import { participantsApi } from '@/lib/api';
import type { Conversation, User } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
  currentUser: User;
  isAdminOrOwner: boolean;
}

export default function MembersDialog({ open, onClose, conversation, currentUser, isAdminOrOwner }: Props) {
  const removeParticipant = useStore((s) => s.removeParticipant);
  const setError = useStore((s) => s.setError);

  async function handleRemove(userId: string) {
    try {
      await participantsApi.remove(conversation.id, userId);
      removeParticipant(conversation.id, userId);
    } catch {
      setError('Failed to remove participant.');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Members</DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <List disablePadding>
          {conversation.participants.map((p) => (
            <ListItem
              key={p.userId}
              disableGutters
              secondaryAction={
                isAdminOrOwner && p.userId !== currentUser.id ? (
                  <Tooltip title="Remove">
                    <IconButton size="small" onClick={() => handleRemove(p.userId)}>
                      <PersonRemoveOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : undefined
              }
            >
              <ListItemAvatar>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                  {p.user?.username?.slice(0, 2).toUpperCase() ?? '?'}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={600} component="span">
                    {p.user?.username ?? 'Unknown'}
                    {p.userId === currentUser.id && (
                      <Typography variant="caption" color="text.disabled" component="span" sx={{ ml: 0.5 }}>
                        (you)
                      </Typography>
                    )}
                  </Typography>
                }
              />
              <Chip
                label={p.role}
                size="small"
                color={p.role === 'MEMBER' ? 'default' : 'warning'}
                sx={{ ml: 1 }}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
