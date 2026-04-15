'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import { alpha } from '@mui/material/styles';

interface Props {
  authorName: string;
  content: string;
  onDismiss?: () => void;
}

export default function ReplyPreview({ authorName, content, onDismiss }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        borderLeft: '3px solid',
        borderColor: 'primary.main',
        pl: 1,
        pr: onDismiss ? 0.5 : 1,
        py: 0.5,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
        borderRadius: 1,
        gap: 1,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" fontWeight={600} color="primary.main" display="block">
          {authorName}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {content}
        </Typography>
      </Box>
      {onDismiss && (
        <IconButton size="small" onClick={onDismiss} sx={{ mt: -0.25 }}>
          <CloseOutlined sx={{ fontSize: 14 }} />
        </IconButton>
      )}
    </Box>
  );
}
