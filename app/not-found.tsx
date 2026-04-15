'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        gap: 2,
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontSize: '8rem',
          fontWeight: 700,
          color: 'text.disabled',
          lineHeight: 1,
          fontFamily: 'var(--font-geist-mono)',
        }}
      >
        404
      </Typography>
      <Typography variant="h6" color="text.secondary">
        Page not found
      </Typography>
      <Button
        component={Link}
        href="/chat"
        variant="contained"
        disableElevation
        sx={{ mt: 1 }}
      >
        Back to chat
      </Button>
    </Box>
  );
}
