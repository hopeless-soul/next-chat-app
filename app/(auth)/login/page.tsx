'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Avatar from '@mui/material/Avatar';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import ChatOutlined from '@mui/icons-material/ChatOutlined';
import { alpha } from '@mui/material/styles';
import { grey } from '@mui/material/colors';
import { authApi, setAuthToken, getErrorMessage } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(username, password);
      // Set default header immediately so AuthGuard's GET /users/me is authenticated
      setAuthToken(data.accessToken);
      sessionStorage.setItem('accessToken', data.accessToken);
      router.replace('/chat');
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 429) {
        setError('Too many attempts, slow down.');
      } else {
        setError(getErrorMessage(err, 'Invalid username or password.'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 400, px: 2 }}>
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: alpha(grey[400], 0.4),
          boxShadow: 4,
          p: 3,
          borderRadius: 2,
        }}
      >
        {/* Logo + Title */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2.5 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'primary.main',
              mb: 1.5,
            }}
          >
            <ChatOutlined fontSize="small" />
          </Avatar>
          <Typography variant="h5" fontWeight={600} textAlign="center">
            Chat App
          </Typography>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Username"
            size="small"
            fullWidth
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <TextField
            label="Password"
            size="small"
            fullWidth
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {error && (
            <Alert severity="error" sx={{ py: 0.5 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            variant="outlined"
            color="inherit"
            fullWidth
            disabled={loading}
            sx={{ mt: 0.5 }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 2 }}
        >
          Don&apos;t have an account?{' '}
          <Link component={NextLink} href="/register" color="primary" underline="hover">
            Register
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
