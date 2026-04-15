'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { conversationsApi, getErrorMessage } from '@/lib/api';
import { useStore } from '@/lib/store';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NewConversationDialog({ open, onClose }: Props) {
  const router = useRouter();
  const upsertConversation = useStore((s) => s.upsertConversation);

  const [tab, setTab] = useState(0);
  const [directUsername, setDirectUsername] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupParticipants, setGroupParticipants] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setDirectUsername('');
    setGroupName('');
    setGroupParticipants('');
    setError('');
    setInfo('');
    setTab(0);
    onClose();
  }

  async function handleDirect(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      // Resolve username → userId
      // The API uses targetUserId, so we first need to look up the user.
      // Since the spec only provides GET /users/me, we attempt to create directly
      // and handle 409 (duplicate) or let the backend resolve the username if it does.
      // Attempt create; the backend may accept username as targetUserId or return 409.
      const { data } = await conversationsApi.createDirect(directUsername);
      upsertConversation(data);
      router.push(`/chat/${data.id}`);
      handleClose();
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 409) {
        // Conflict — conversation already exists; fetch existing
        setInfo('You already have a conversation with this user.');
        // Try to navigate by fetching conversation list
        try {
          const listRes = await conversationsApi.list();
          const existing = listRes.data.find(
            (c: { type: string; participants: { username: string }[] }) =>
              c.type === 'direct' &&
              c.participants.some((p: { username: string }) => p.username === directUsername),
          );
          if (existing) {
            upsertConversation(existing);
            router.push(`/chat/${existing.id}`);
            handleClose();
          }
        } catch {
          // ignore
        }
      } else {
        setError(getErrorMessage(err, 'Could not start conversation.'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGroup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const participants = groupParticipants
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const { data } = await conversationsApi.createGroup(groupName, participants);
      upsertConversation(data);
      router.push(`/chat/${data.id}`);
      handleClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create group.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 0, fontWeight: 700 }}>New conversation</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setError(''); setInfo(''); }}
          sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', minWidth: 0 } }}
        >
          <Tab label="Direct" />
          <Tab label="Group" />
        </Tabs>

        {tab === 0 && (
          <Box component="form" id="direct-form" onSubmit={handleDirect} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              label="Username"
              size="small"
              fullWidth
              value={directUsername}
              onChange={(e) => setDirectUsername(e.target.value)}
              helperText="Enter the exact username."
              required
            />
            {error && <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>}
            {info && <Alert severity="info" sx={{ py: 0.5 }}>{info}</Alert>}
          </Box>
        )}

        {tab === 1 && (
          <Box component="form" id="group-form" onSubmit={handleGroup} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              label="Group name"
              size="small"
              fullWidth
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
            <TextField
              label="Participants"
              size="small"
              fullWidth
              value={groupParticipants}
              onChange={(e) => setGroupParticipants(e.target.value)}
              helperText="Comma-separated usernames."
            />
            {error && <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit" variant="outlined" size="small">
          Cancel
        </Button>
        <Button
          type="submit"
          form={tab === 0 ? 'direct-form' : 'group-form'}
          variant="contained"
          size="small"
          disabled={loading}
        >
          {tab === 0 ? 'Start conversation' : 'Create group'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
