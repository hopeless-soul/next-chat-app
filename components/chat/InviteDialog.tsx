'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { participantsApi, getErrorMessage } from '@/lib/api';
import { useStore } from '@/lib/store';

interface Props {
  open: boolean;
  onClose: () => void;
  conversationId: string;
}

export default function InviteDialog({ open, onClose, conversationId }: Props) {
  const addParticipant = useStore((s) => s.addParticipant);
  const [usernames, setUsernames] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setUsernames('');
    setError('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ids = usernames.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      const { data } = await participantsApi.invite(conversationId, ids);
      data.forEach((p: Parameters<typeof addParticipant>[1] & { conversationId?: string }) => addParticipant(conversationId, p));
      handleClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to invite.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Invite people</DialogTitle>
      <DialogContent>
        <Box component="form" id="invite-form" onSubmit={handleSubmit} sx={{ pt: 0.5 }}>
          <TextField
            label="User IDs or usernames"
            size="small"
            fullWidth
            value={usernames}
            onChange={(e) => setUsernames(e.target.value)}
            helperText="Comma-separated."
            required
          />
          {error && <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit" variant="outlined" size="small">Cancel</Button>
        <Button type="submit" form="invite-form" variant="contained" size="small" disabled={loading}>
          Invite
        </Button>
      </DialogActions>
    </Dialog>
  );
}
