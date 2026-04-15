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
import { conversationsApi, getErrorMessage } from '@/lib/api';
import { useStore } from '@/lib/store';
import type { Conversation } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
}

export default function EditGroupDialog({ open, onClose, conversation }: Props) {
  const upsertConversation = useStore((s) => s.upsertConversation);
  const [name, setName] = useState(conversation.name ?? '');
  const [description, setDescription] = useState(conversation.description ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setError('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await conversationsApi.updateGroup(conversation.id, {
        name: name || undefined,
        description: description || undefined,
      });
      upsertConversation(data);
      handleClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update group.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Edit group</DialogTitle>
      <DialogContent>
        <Box component="form" id="edit-group-form" onSubmit={handleSubmit} sx={{ pt: 0.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Group name" size="small" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Description" size="small" fullWidth value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={2} />
          {error && <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit" variant="outlined" size="small">Cancel</Button>
        <Button type="submit" form="edit-group-form" variant="contained" size="small" disabled={loading}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
