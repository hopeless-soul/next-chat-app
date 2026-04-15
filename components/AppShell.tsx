'use client';

import { type ReactNode } from 'react';
import Box from '@mui/material/Box';
import AuthGuard from './AuthGuard';
import SocketProvider from './SocketProvider';
import ErrorSnackbar from './ErrorSnackbar';
import Sidebar from './sidebar/Sidebar';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <SocketProvider />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
        <Sidebar />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </Box>
      </Box>
      <ErrorSnackbar />
    </AuthGuard>
  );
}
