'use client';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useStore } from '@/lib/store';

export default function ErrorSnackbar() {
  const errorMessage = useStore((s) => s.errorMessage);
  const setError = useStore((s) => s.setError);

  return (
    <Snackbar
      open={!!errorMessage}
      autoHideDuration={4000}
      onClose={() => setError(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity="error"
        onClose={() => setError(null)}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {errorMessage}
      </Alert>
    </Snackbar>
  );
}
