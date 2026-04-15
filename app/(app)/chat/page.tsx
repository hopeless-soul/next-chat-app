import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';

export default function ChatWelcomePage() {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        bgcolor: 'background.default',
      }}
    >
      <ChatBubbleOutlineOutlined sx={{ fontSize: 64, color: 'text.disabled' }} />
      <Typography variant="h6" fontWeight={600} color="text.primary">
        Your messages
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Select a conversation or start a new one.
      </Typography>
    </Box>
  );
}
