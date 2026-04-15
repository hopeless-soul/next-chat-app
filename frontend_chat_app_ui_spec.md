# Chat App — Frontend UI Spec

> Aesthetic mirrors the Photo app: dark theme, MUI + Tailwind, Geist font, flat elevation-0 cards with 1px divider borders, blue primary accent.

---

## Design System

### Visual Direction

Dark theme, minimalist, flat. No shadows — depth comes from 1px `divider` borders. Clean Material Design with Geist typography. Micro-interactions are subtle (opacity fades, scale transforms on click). Same overall feel as the Photo app: calm, content-first, no decoration for its own sake.

### Colors

Matches the Photo app MUI dark theme:

| Token | Value / MUI token |
|-------|-------------------|
| Background | `background.default` (`#0a0a0a`) |
| Surface / cards | `background.paper` |
| Border | `divider` (1px, semi-transparent grey) |
| Text primary | `text.primary` (`#ededed`) |
| Text secondary | `text.secondary` |
| Text muted | `text.disabled` |
| Accent / primary | `primary.main` (`#1976d2`) |
| Danger / destructive | `error.main` |
| Online indicator | `success.main` (green) |
| Offline indicator | `text.disabled` |

### Typography

- **Font**: Geist Sans (`--font-geist-sans`) for all text, Geist Mono (`--font-geist-mono`) for code or message IDs.
- **Antialiasing**: `antialiased` on body.
- **Headings**: `fontWeight: 700` — section titles, dialog headers.
- **Labels**: `fontWeight: 600` — usernames, conversation names.
- **Body**: `fontWeight: 400` — message content, descriptions.
- **Small / meta**: `variant="caption"`, `color="text.secondary"` — timestamps, "edited", last seen.

### Motion & Interactions

- Sidebar width transition: `transition: 'width .2s'`.
- Image/avatar hover: `opacity: 0.85`, `transition: 'opacity .2s'`.
- Button active scale: `'&:active': { transform: 'scale(0.85)' }` on icon buttons.
- Color transitions: `transition: 'color 0.15s'` on toggleable icons (e.g., active conversation highlight).
- No page-level animations — transitions are component-scoped only.

### Component Primitives

All match Photo app conventions:

- **Button**: `disableElevation` always. `variant="outlined" color="inherit"` for secondary actions. `variant="contained"` for primary CTA.
- **Input / TextField**: `size="small"` in forms. `variant="standard"` (underline only) for inline inputs like message composer.
- **Card / Paper**: `elevation={0}`, `border: '1px solid', borderColor: 'divider'`, `borderRadius: 2` (8px).
- **Avatar**: `bgcolor: 'primary.main'` fallback with initials. Sizes: 36px (conversation list), 32px (message bubbles), 28px (compact), 24px (inline).
- **Chip**: `size="small"`. Role chip: `color="warning"` for OWNER/ADMIN, `default` for MEMBER.
- **IconButton**: `size="small"`. Outlined MUI icons for default state, filled for active.
- **Tooltip**: Wrap all icon-only actions.
- **Dialog**: `fullWidth`. `maxWidth="xs"` for confirmations/forms, `maxWidth="sm"` for conversation detail, `maxWidth="lg"` for nothing major in v1.
- **Skeleton**: Circular for avatars, rectangular for message content — shown during initial load.

---

## Auth Layout

Full-height centered page (`minHeight: '100vh'`, flex, centered). `Container maxWidth="xs"`. No navbar. Dark background same as app shell. Logo mark at top of card: small circle `40x40`, `bgcolor: 'primary.main'`, `borderRadius: '50%'` with a chat icon inside. Card: `Paper elevation={0}`, `border: '1px solid'`, `borderColor: alpha(grey[400], 0.4)`, `boxShadow: theme.shadows[4]`, `p: 3`.

---

## Login Page

Card contains:
1. Logo circle + app name (`variant="h5"`, `fontWeight: 600`, centered).
2. `Divider` with spacing.
3. Two `TextField size="small" fullWidth`: Username, Password (with show/hide toggle via `InputAdornment`).
4. Submit button: `variant="outlined" color="inherit" fullWidth`, label "Sign in".
5. Link below: "Don't have an account? Register" — `variant="caption"`, `color="text.secondary"`.

Errors: 401 → inline `Alert severity="error"` above the submit button. 429 → same alert with "Too many attempts, slow down."

---

## Register Page

Same card layout as Login. Fields: Username, Password. Submit button label: "Create account". Link below: "Already have an account? Sign in". Validation errors (400): show `Alert severity="error"` with the server's message string. On success, redirect to `/chat`.

---

## App Shell

Two-column layout: fixed-width sidebar on the left + `flex: 1` main panel on the right. Full height (`minHeight: '100vh'`). No top navbar — navigation lives in the sidebar. Sidebar is always visible on desktop. The split mirrors the Photo app's admin layout (permanent sidebar + content area).

```
┌──────────────────────┬──────────────────────────────┐
│  Sidebar  (260px)    │  Main panel  (flex: 1)       │
│                      │                              │
│  [ App logo / name ] │  {active conversation or     │
│  ─────────────────   │   welcome screen}            │
│  ConversationItem    │                              │
│  ConversationItem    │                              │
│  ConversationItem    │                              │
│  ...                 │                              │
│  ─────────────────   │                              │
│  [ User avatar/name ]│                              │
└──────────────────────┴──────────────────────────────┘
```

Sidebar border: `borderRight: '1px solid', borderColor: 'divider'`. No collapse in v1 — fixed at 260px.

---

## Conversation Sidebar

**Header**: App name/logo at top (`variant="h6"`, `fontWeight: 700`), "New conversation" icon button (`AddCommentOutlined`) aligned right. `p: 2`. Separated from list by `Divider`.

**Conversation list**: Scrollable `List` filling remaining height. Items sorted by most recently active (static order in v1 — order from `GET /conversations`).

**Bottom**: `Divider` then a row with the current user's `Avatar` (36px, initials) + `username` (`variant="body2"`, `fontWeight: 600`) + settings `IconButton` (link to `/settings`). `p: 2`.

### Conversation Item

`ListItem` with `ListItemButton`.

- **Avatar** (36px): Group icon (`GroupOutlined`) for group conversations, user initials for direct.
- **Presence dot**: For direct conversations, a small circle (`10x10`, `bgcolor: 'success.main'` or `text.disabled`) overlaid on the avatar bottom-right corner.
- **Name**: `variant="body2"`, `fontWeight: 600`. For direct: the other participant's username. For group: the group name.
- **Type label**: `variant="caption"`, `color="text.disabled"` — "Direct" or "Group".
- **Active state**: `bgcolor: alpha(primary.main, 0.12)`, left border `3px solid primary.main`.
- **Hover state**: `bgcolor: action.hover`.

### New Conversation Dialog

`Dialog maxWidth="xs" fullWidth`. Title: "New conversation".

Two tabs at top: "Direct" | "Group" (MUI Tabs, `textTransform: 'none'`).

**Direct tab**: Single `TextField size="small" fullWidth` — "Username". Helper text: "Enter the exact username." Submit button: "Start conversation". On 409: show `Alert severity="info"` — "You already have a conversation with this user" — and navigate to it.

**Group tab**: `TextField` for group name (required). Second `TextField` for participant usernames (comma-separated, helper text: "Comma-separated usernames"). Submit button: "Create group".

---

## Chat Welcome Screen

Centered in the main panel, vertically and horizontally. `ChatBubbleOutlineOutlined` icon large (`fontSize: 64`), `color="text.disabled"`. Below: `variant="h6"`, `fontWeight: 600`, "Your messages". Below: `variant="body2"`, `color="text.secondary"`, "Select a conversation or start a new one."

---

## Active Conversation

### Conversation Header

Fixed at top of main panel. `borderBottom: '1px solid', borderColor: 'divider'`. Height ~56px. `px: 2`. Flex row, `alignItems: 'center'`.

- **Left**: Avatar (32px) + name (`variant="body2"`, `fontWeight: 600`) + status text (`variant="caption"`, `color="text.secondary"` — "Online" / "Last seen [relative time]" for direct; "X members" for group).
- **Right**: `MoreVertOutlined` `IconButton` opens a dropdown menu:
  - "View members" (all)
  - "Invite people" (OWNER/ADMIN, group only)
  - "Edit group" (OWNER/ADMIN, group only)
  - "Leave" (`color: 'error.main'`)

### Message Feed

Fills remaining height between header and input. `overflow-y: auto`. Flex column, messages rendered bottom-up (newest at bottom).

- **Initial load**: Show 3 `Skeleton` rows (circular 32px + 2 rectangular lines each).
- **Load more**: When scrolled to top, fetch next page. Show `CircularProgress size={20}` centered above the oldest message while fetching.
- **Date separators**: `Divider` with centered `Chip size="small"` label ("Today", "Yesterday", "Jan 12") between message groups from different days.
- **Message grouping**: Consecutive messages from the same author within 5 minutes collapse the avatar and author name — only the first in the group shows them.
- **Empty state**: Centered caption — "No messages yet. Say hello!"
- **Padding**: `px: 2, py: 1.5`.

### Message Bubble

Flex row. Avatar on the left (32px, shown only for first in group). Message block to the right.

- **Author name**: `variant="caption"`, `fontWeight: 600` — shown in group conversations, first message in group only.
- **Content**: `variant="body2"`. Wrapped in a `Paper elevation={0}` pill: `border: '1px solid', borderColor: 'divider'`, `borderRadius: 2`, `px: 2, py: 1`. Own messages: `bgcolor: alpha(primary.main, 0.1)`, slightly right-indented.
- **Timestamp**: `variant="caption"`, `color="text.disabled"` — shown on hover to the right of the bubble.
- **Deleted message**: Replace content with `variant="caption"` italic — "Message deleted" — no bubble background, lighter border.
- **Edited label**: `variant="caption"`, `color="text.disabled"` inline after content — "(edited)".
- **Hover actions**: Appear on bubble hover — `IconButton size="small"` row floating above the bubble: Reply, Edit (own only), Delete (own only).

### Reply Preview

Displayed as a left-bordered block above the message content: `borderLeft: '3px solid', borderColor: 'primary.main'`, `pl: 1`, `bgcolor: alpha(primary.main, 0.06)`, `borderRadius: 1`.

- **In bubble**: Author name (`variant="caption"`, `fontWeight: 600`, `color="primary.main"`) + truncated content (`variant="caption"`, `color="text.secondary"`, single line, `noWrap`). Not dismissable.
- **In input**: Same visual style, but full-width strip above the TextField with a `CloseOutlined` `IconButton` on the right to dismiss.

### Message Input

Fixed at bottom of main panel. `borderTop: '1px solid', borderColor: 'divider'`. `px: 2, py: 1.5`.

- **Reply strip**: Shown above input when replying (see Reply Preview). `mb: 1`.
- **Input row**: `TextField variant="standard"` (underline only, `disableUnderline`), multiline, max 4 rows, `fullWidth`, placeholder "Message…". `size="small"`.
- **Send button**: `IconButton` with `SendOutlined` icon to the right. Active when input is non-empty. `color="primary"`.
- **Submit**: Enter sends (Shift+Enter = newline).
- **Throttled state (429)**: Input and send button disabled. `caption` text below: "Slow down…" with auto-enable after cooldown.

---

## Settings Page

No sidebar change — same shell. Main panel content, `maxWidth: 480`, `mx: 'auto'`, `pt: 4`.

Title: `variant="h6"`, `fontWeight: 700`, "Settings".

Three `Paper elevation={0} border divider borderRadius: 2` sections separated by `mb: 2`:

1. **Profile** — `p: 3`. Avatar (64px, initials, `primary.main`) centered. Username `TextField size="small" fullWidth` below. Save button: `variant="outlined" color="inherit"`.

2. **Security** — `p: 3`. Heading `variant="body2" fontWeight: 600`. Fields: New username (optional), New password, Confirm password — all `size="small" fullWidth`. Save button same style.

3. **Session** — `p: 3`. Single "Sign out" `Button variant="outlined" color="error" fullWidth`. On click: clear token, disconnect socket, redirect `/login`.

---

## Error & Empty States

- **Toast errors**: MUI `Snackbar` + `Alert severity="error"` — bottom-center, auto-hide 4s. Used for 500, failed sends, failed edits.
- **Inline alerts**: `Alert severity="error"` inside forms for 400/401/409.
- **Rate limit**: Inline disabled state on the triggering control + caption countdown. No toast.
- **Empty conversation list**: Below the sidebar header — `variant="caption"`, `color="text.disabled"`, centered — "No conversations yet."
- **Empty message feed**: Centered in feed area — "No messages yet. Say hello!"
- **404 / route not found**: Full-height centered, same gradient-mask background as Photo app error page. Large muted text "404", subtitle, "Back to chat" contained button.
- **Loading skeletons**: Used for conversation list (3 placeholder items on initial load) and message feed (3 placeholder bubbles).

---

## Presence & Status

- **Sidebar dot**: `10x10` circle overlaid on avatar (bottom-right). `bgcolor: 'success.main'` when online, `bgcolor: 'text.disabled'` (grey) when offline. No dot at all until presence data arrives.
- **Conversation header**: "Online" in `color="success.main"` when direct contact is online. "Last seen [relative time]" in `color="text.secondary"` when offline (`lastSeen` ISO string formatted as "5 minutes ago", "Yesterday at 14:30", etc.).
- **Group conversations**: No per-member presence in header — just member count.
- **Presence resets on page refresh** — no persistence, matches backend behavior.
