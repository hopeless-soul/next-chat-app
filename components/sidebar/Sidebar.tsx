'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import Avatar from '@mui/material/Avatar';
import Skeleton from '@mui/material/Skeleton';
import AddCommentOutlined from '@mui/icons-material/AddCommentOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import ChatOutlined from '@mui/icons-material/ChatOutlined';
import NextLink from 'next/link';
import { useStore, selectConversations } from '@/lib/store';
import { conversationsApi } from '@/lib/api';
import ConversationItem from './ConversationItem';
import NewConversationDialog from './NewConversationDialog';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const conversations = useStore(selectConversations);
  const setConversations = useStore((s) => s.setConversations);
  const currentUser = useStore((s) => s.currentUser);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    conversationsApi
      .list()
      .then(({ data }) => {
        if (!cancelled) {
          setConversations(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Derive active conversation id from pathname /chat/[id]
  const activeId = pathname.startsWith('/chat/') ? pathname.split('/')[2] : null;

  const initials = currentUser?.username
    ? currentUser.username.slice(0, 2).toUpperCase()
    : '?';

  return (
    <>
      <Box
        sx={{
          width: 260,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid',
          borderColor: 'divider',
          height: '100%',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ChatOutlined sx={{ color: 'primary.main', fontSize: 20 }} />
            <Typography variant="h6" fontWeight={700}>
              Messages
            </Typography>
          </Box>
          <Tooltip title="New conversation">
            <IconButton size="small" onClick={() => setDialogOpen(true)}>
              <AddCommentOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider />

        {/* Conversation list */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <Box sx={{ px: 2, py: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[0, 1, 2].map((i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Skeleton variant="circular" width={36} height={36} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="70%" height={16} />
                    <Skeleton variant="text" width="40%" height={13} />
                  </Box>
                </Box>
              ))}
            </Box>
          ) : conversations.length === 0 ? (
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ display: 'block', textAlign: 'center', mt: 4 }}
            >
              No conversations yet.
            </Typography>
          ) : (
            <List disablePadding>
              {conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  currentUserId={currentUser?.id ?? ''}
                  active={conv.id === activeId}
                />
              ))}
            </List>
          )}
        </Box>

        <Divider />

        {/* User footer */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'primary.main',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            {initials}
          </Avatar>
          <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }} noWrap>
            {currentUser?.username ?? '—'}
          </Typography>
          <Tooltip title="Settings">
            <IconButton size="small" component={NextLink} href="/settings">
              <SettingsOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <NewConversationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
