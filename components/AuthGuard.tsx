'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useStore } from '@/lib/store';
import { usersApi, setAuthToken } from '@/lib/api';

type AuthStatus = 'loading' | 'authenticated';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const token = useStore((s) => s.token);
  const setAuth = useStore((s) => s.setAuth);
  const clearAuth = useStore((s) => s.clearAuth);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    // Already authenticated (e.g. navigated here after login without a page reload)
    if (token) {
      setStatus('authenticated');
      return;
    }

    const stored = sessionStorage.getItem('accessToken');
    if (!stored) {
      router.replace('/login');
      return;
    }

    // Set the default header BEFORE calling getMe so the request is authenticated
    setAuthToken(stored);

    // Rehydrate: verify stored token is still valid
    usersApi
      .getMe()
      .then(({ data }) => {
        setAuth(stored, data);
        setStatus('authenticated');
      })
      .catch(() => {
        setAuthToken(null);
        clearAuth();
        router.replace('/login');
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  return <>{children}</>;
}
