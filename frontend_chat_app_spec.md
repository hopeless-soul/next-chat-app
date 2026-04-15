# Project: Chat App Frontend Spec

> **Scope:** API integration, WebSocket contracts, auth flow, state model, and data types.
> UI layout, component hierarchy, and styling are out of scope — those are defined separately.

---

## 1) Stack (recommended)

| Concern | Library |
|---------|---------|
| HTTP client | `axios` or native `fetch` |
| WebSocket | `socket.io-client` v4 (must match server) |
| State | Your choice — this spec is framework-agnostic |
| Types | TypeScript interfaces defined in §6 |

---

## 2) Auth

### 2.1 Login / Register flow

1. `POST /auth/register` or `POST /auth/login` — see §3.1
2. Store the returned `accessToken` in memory (not `localStorage` if XSS is a concern)
3. Attach the token on every HTTP request: `Authorization: Bearer <token>`
4. On 401, clear the token and redirect to login

### 2.2 Token lifecycle

- The backend issues a JWT with a configurable expiry (`JWT_EXPIRES_IN`)
- No refresh token endpoint exists in v1 — session ends when the token expires
- Logout: discard the token client-side; no server call required in v1

---

## 3) REST API

Base path: `http(s)://<host>`

All authenticated endpoints require: `Authorization: Bearer <accessToken>`

### 3.1 Auth

#### Register
```
POST /auth/register
Body: { "username": string, "password": string }
Response 201: { "accessToken": string }
```

#### Login
```
POST /auth/login
Body: { "username": string, "password": string }
Response 200: { "accessToken": string }
```

---

### 3.2 Users

#### Get own profile
```
GET /users/me
Response 200: User
```

#### Update own profile
```
PATCH /users/me
Body: { "username"?: string, "password"?: string }
Response 200: User
```

> Password change requires the current password field (backend enforces this).

---

### 3.3 Conversations

#### Create conversation
```
POST /conversations
Body (direct):  { "type": "direct",  "targetUserId": string }
Body (group):   { "type": "group",   "participants": string[], "name": string }
Response 201: Conversation
```

Rules:
- Creating a direct conversation with a user you already have one with returns a conflict or the existing conversation (handle 409)
- `name` is required for group conversations

#### List my conversations
```
GET /conversations
Response 200: Conversation[]
```

#### Get conversation details
```
GET /conversations/:conversationId
Response 200: Conversation   // includes participants[], no message history
```

#### Update group conversation
```
PATCH /conversations/:conversationId
Body: { "name"?: string, "avatar"?: string, "description"?: string }
Response 200: Conversation
```

Only for group conversations. Only available to OWNER or ADMIN.

---

### 3.4 Participants

#### Invite participants
```
POST /conversations/:conversationId/participants
Body: { "userIds": string[] }
Response 201: ConversationParticipant[]
```

#### Remove a participant (admin/owner only)
```
DELETE /conversations/:conversationId/participants/:userId
Response 204
```

#### Leave a conversation
```
DELETE /conversations/:conversationId/participants/me
Response 204
```

---

### 3.5 Messages

#### Send a message
```
POST /conversations/:conversationId/messages
Body: { "content": string, "replyToMessageId"?: string }
Response 201: Message
```

#### Edit a message
```
PATCH /conversations/:conversationId/messages/:messageId
Body: { "content": string }
Response 200: Message
```

#### Delete a message
```
DELETE /conversations/:conversationId/messages/:messageId
Response 204
```

#### List messages (paginated)
```
GET /conversations/:conversationId/messages?cursor=<messageId>&limit=<number>
Response 200: {
  "data": Message[],
  "nextCursor": string | null
}
```

Pagination rules:
- Messages are returned newest-first (or oldest-first — confirm with backend; adjust accordingly)
- Pass `cursor` from `nextCursor` of the previous response to load older messages
- `nextCursor: null` means you have reached the end
- Recommended `limit`: 50
- On initial load: omit `cursor`; on scroll-to-top: pass the cursor from the previous response

---

## 4) WebSocket (Socket.IO)

### 4.1 Connection

```
namespace: /chat
url:        ws(s)://<host>/chat
auth:       { token: "<accessToken>" }   // Socket.IO handshake auth field
```

Alternative (if headers are supported by your client/transport):
```
extraHeaders: { Authorization: "Bearer <accessToken>" }
```

Connect only after a valid `accessToken` exists. On connect, the server automatically joins all conversation rooms — no manual join needed for existing memberships.

### 4.2 Disconnect / reconnect

- On token expiry, the server will reject the connection (or a guard will close it)
- Re-attempt connection after obtaining a fresh token
- Do not loop-retry on auth failure (401/403 close codes)

### 4.3 Client → Server events

| Event | Payload | When to emit |
|-------|---------|--------------|
| `conversation:join` | `{ conversationId: string }` | After being added to a group mid-session (backup — server does this automatically) |
| `conversation:leave` | `{ conversationId: string }` | When the user minimizes/hides a conversation UI without leaving the group |

### 4.4 Server → Client events

#### Message events

| Event | Payload type | Action |
|-------|-------------|--------|
| `message.created` | `Message` | Append to the conversation's message list |
| `message.updated` | `Message` | Replace the matching message in the list |
| `message.deleted` | `{ messageId: string }` | Remove or mark the message as deleted in the list |

#### Conversation events

| Event | Payload type | Action |
|-------|-------------|--------|
| `conversation.updated` | `Conversation` | Update the stored conversation metadata |
| `conversation.participant_added` | `ConversationParticipant` | Add the participant to the conversation's member list |
| `conversation.participant_removed` | `{ userId: string }` | Remove the participant from the member list |
| `conversation.participant_left` | `{ userId: string }` | Remove the participant from the member list (voluntary leave) |

#### Presence events

| Event | Payload type | Action |
|-------|-------------|--------|
| `user.online` | `{ userId: string, username: string }` | Mark the user as online in the UI |
| `user.offline` | `{ userId: string, username: string, lastSeen: string }` | Mark the user as offline, update `lastSeen` display |

Presence rules for the client:
- These events fire only for users who share a conversation with the current user
- The current user does NOT receive presence events about themselves
- Track online status in a `Map<userId, boolean>` (reset on reconnect)
- `lastSeen` is an ISO 8601 string

---

## 5) Error handling

### HTTP errors

| Status | Meaning | Suggested action |
|--------|---------|-----------------|
| 400 | Validation error | Show field errors from `message` array |
| 401 | Unauthenticated | Clear token, redirect to login |
| 403 | Forbidden | Show permission error, do not retry |
| 404 | Not found | Remove the item from state or show not-found message |
| 409 | Conflict (e.g. duplicate direct conv.) | Surface the error or fetch the existing resource |
| 429 | Rate limited | Back off; show "slow down" message |
| 500 | Server error | Generic error toast |

### WebSocket errors

- `connect_error` with auth failure: redirect to login
- Unexpected disconnect: show reconnecting indicator; Socket.IO auto-reconnects by default
- Event payload shape mismatch: log and ignore; do not crash the UI

---

## 6) TypeScript data types

These mirror the backend entities. Define them once and share across features.

```ts
type ConversationType = 'direct' | 'group';
type ConversationRole = 'OWNER' | 'ADMIN' | 'MEMBER';
type AppRole = 'USER' | 'ADMIN';

interface User {
  id: string;
  username: string;
  lastSeen: string | null; // ISO 8601 or null if never connected
  role: AppRole;
}

interface ConversationParticipant {
  userId: string;
  username: string;
  role: ConversationRole;
  joinedAt: string;
}

interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;         // null for direct conversations
  avatar: string | null;
  description: string | null;
  participants: ConversationParticipant[];
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  authorId: string;
  author: Pick<User, 'id' | 'username'>;
  content: string;
  replyToMessageId: string | null;
  replyTo: Pick<Message, 'id' | 'content' | 'authorId'> | null;
  editedAt: string | null;
  deletedAt: string | null;    // non-null = soft-deleted
  createdAt: string;
}

interface MessagePage {
  data: Message[];
  nextCursor: string | null;
}

interface PresenceMap {
  [userId: string]: boolean;
}
```

---

## 7) Client-side state model (guidance)

Minimum state slices needed:

```
auth
  accessToken: string | null
  currentUser: User | null

conversations
  list: Conversation[]           // sidebar / conversation list
  active: Conversation | null    // currently open conversation

messages
  byConversationId: {
    [conversationId: string]: {
      items: Message[]
      nextCursor: string | null
      loading: boolean
    }
  }

presence
  online: Set<string>            // userIds currently online
```

Sync rules:
- On `message.created`: prepend/append to the matching conversation's `items`; deduplicate by `id` to guard against double-delivery
- On `message.updated`: replace in-place
- On `message.deleted`: set `deletedAt` or remove from list — match backend soft-delete behavior
- On `conversation.updated`: merge into the conversations list by `id`
- On participant events: mutate the `participants` array on the matching conversation

---

## 8) Out of scope (v1)

Do not implement client-side support for these unless explicitly added to the backend:

- Typing indicators
- Read receipts
- Message threading beyond single-level replies
- Media / file uploads
- Push notifications
- Offline message queue / local persistence
- E2E encryption
- Presence persistence across page refresh (presence resets on server restart)
