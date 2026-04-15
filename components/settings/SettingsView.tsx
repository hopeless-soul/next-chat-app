'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import { useStore } from '@/lib/store';
import { usersApi, getErrorMessage } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';

export default function SettingsView() {
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);
  const setAuth = useStore((s) => s.setAuth);
  const clearAuth = useStore((s) => s.clearAuth);
  const token = useStore((s) => s.token);

  const [username, setUsername] = useState(currentUser?.username ?? '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMsg, setSecurityMsg] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);

  const initials = currentUser?.username?.slice(0, 2).toUpperCase() ?? '?';

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileError('');
    setProfileMsg('');
    setProfileLoading(true);
    try {
      const { data } = await usersApi.updateMe({ username });
      if (token) setAuth(token, data);
      setProfileMsg('Profile updated.');
    } catch (err) {
      setProfileError(getErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleSecuritySave(e: React.FormEvent) {
    e.preventDefault();
    setSecurityError('');
    setSecurityMsg('');
    if (newPassword && newPassword !== confirmPassword) {
      setSecurityError('Passwords do not match.');
      return;
    }
    setSecurityLoading(true);
    try {
      await usersApi.updateMe({ password: newPassword || undefined });
      setSecurityMsg('Security settings updated.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setSecurityError(getErrorMessage(err, 'Failed to update security settings.'));
    } finally {
      setSecurityLoading(false);
    }
  }

  function handleSignOut() {
    clearAuth();
    disconnectSocket();
    router.replace('/login');
  }

  return (
    <Box
      sx={{
        flex: 1,
        overflowY: 'auto',
        bgcolor: 'background.default',
        pt: 4,
        pb: 4,
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: 480, mx: 'auto' }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
          Settings
        </Typography>

        {/* Profile */}
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 3,
            mb: 2,
          }}
        >
          <Box component="form" onSubmit={handleProfileSave} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: '1.5rem', fontWeight: 600 }}>
                {initials}
              </Avatar>
              <Typography variant="body2" fontWeight={600}>
                {currentUser?.username}
              </Typography>
            </Box>

            <Divider />

            <Typography variant="body2" fontWeight={600}>
              Profile
            </Typography>
            <TextField
              label="Username"
              size="small"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {profileError && <Alert severity="error" sx={{ py: 0.5 }}>{profileError}</Alert>}
            {profileMsg && <Alert severity="success" sx={{ py: 0.5 }}>{profileMsg}</Alert>}
            <Button type="submit" variant="outlined" color="inherit" disabled={profileLoading} sx={{ alignSelf: 'flex-start' }}>
              {profileLoading ? 'Saving…' : 'Save'}
            </Button>
          </Box>
        </Paper>

        {/* Security */}
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 3,
            mb: 2,
          }}
        >
          <Box component="form" onSubmit={handleSecuritySave} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              Security
            </Typography>
            <TextField
              label="New password"
              size="small"
              fullWidth
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <TextField
              label="Confirm password"
              size="small"
              fullWidth
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            {securityError && <Alert severity="error" sx={{ py: 0.5 }}>{securityError}</Alert>}
            {securityMsg && <Alert severity="success" sx={{ py: 0.5 }}>{securityMsg}</Alert>}
            <Button type="submit" variant="outlined" color="inherit" disabled={securityLoading} sx={{ alignSelf: 'flex-start' }}>
              {securityLoading ? 'Saving…' : 'Save'}
            </Button>
          </Box>
        </Paper>

        {/* Session */}
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 3,
          }}
        >
          <Typography variant="body2" fontWeight={600} sx={{ mb: 2 }}>
            Session
          </Typography>
          <Button
            variant="outlined"
            color="error"
            fullWidth
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}
