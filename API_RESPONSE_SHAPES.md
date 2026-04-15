# Chat App - API Response Shapes Documentation

**Last Updated:** April 15, 2026

Complete documentation of all API response structures, entities, and data shapes across the NestJS backend.

---

## Table of Contents

1. [Global Response Patterns](#global-response-patterns)
2. [Auth Module](#auth-module)
3. [Users Module](#users-module)
4. [Conversations Module](#conversations-module)
5. [Messages Module](#messages-module)
6. [WebSocket Gateway](#websocket-gateway)
7. [Common Module](#common-module)

---

## Global Response Patterns

### Success Response Wrapper
All successful responses are wrapped by `TransformInterceptor`:

```typescript
{
  data: T,              // Actual response body
  statusCode: 200 | 201 // HTTP status code
}
```

### Error Response Format
All errors return a standardized format from `HttpExceptionFilter`:

```typescript
{
  statusCode: number,   // 400, 401, 403, 404, 409, 500, etc.
  timestamp: string,    // ISO date: "2026-04-15T10:30:45.123Z"
  path: string,         // Request URL path: "/api/conversations"
  message: unknown      // Error message or validation details
}
```

### No-Content Responses
DELETE endpoints return **204 No Content** with empty body:
- `DELETE /conversations/:conversationId/participants/me`
- `DELETE /conversations/:conversationId/participants/:userId`
- `DELETE /conversations/:conversationId/messages/:messageId`

---

## Auth Module

**Base Route:** `/auth`
**Location:** `src/auth/`

### Endpoints

#### POST `/auth/register`
- **Authentication:** None (Throttled: 5 requests/min)
- **Input (RequestBody):**
  ```typescript
  {
    username: string,   // 3-30 chars, alphanumeric + underscore
    password: string    // 8-72 chars
  }
  ```
- **Output (200 Created):**
  ```typescript
  {
    data: {
      accessToken: string  // JWT with payload: { sub: userId, username }
    },
    statusCode: 201
  }
  ```
- **Error Cases:**
  - `409 Conflict` - Username already exists
  - `400 Bad Request` - Invalid input validation

#### POST `/auth/login`
- **Authentication:** LocalAuthGuard (username + password) - Throttled: 10 requests/min
- **Input (RequestBody):**
  ```typescript
  {
    username: string,   // 1-30 chars
    password: string    // 1-72 chars
  }
  ```
- **Output (200 OK):**
  ```typescript
  {
    data: {
      accessToken: string  // JWT with payload: { sub: userId, username }
    },
    statusCode: 200
  }
  ```
- **Error Cases:**
  - `401 Unauthorized` - Invalid credentials
  - `400 Bad Request` - Invalid input

### DTOs

#### RegisterDto
```typescript
interface RegisterDto {
  username: string;     // Min 3, Max 30, Pattern: /^[a-zA-Z0-9_]+$/
  password: string;     // Min 8, Max 72
}
```

#### LoginDto
```typescript
interface LoginDto {
  username: string;     // Min 1, Max 30
  password: string;     // Min 1, Max 72
}
```

### Service Methods

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `register(dto)` | `RegisterDto` | `Promise<{ accessToken: string }>` | Creates user and returns JWT |
| `login(user)` | `User` | `{ accessToken: string }` | Issues JWT for authenticated user |
| `validateUser(username, password)` | `string, string` | `Promise<User \| null>` | Validates credentials |
| `changePassword(userId, currentPassword, newPassword)` | `string, string, string` | `Promise<void>` | Updates password hash |

---

## Users Module

**Base Route:** `/users`
**Location:** `src/users/`
**Authentication:** JwtAuthGuard (all endpoints)

### Endpoints

#### GET `/users/me`
- **Authentication:** Required (JWT)
- **Input:** None
- **Output (200 OK):**
  ```typescript
  {
    data: {
      id: string,              // UUID
      username: string,        // Unique
      role: "USER" | "ADMIN",  // Default: "USER"
      lastSeen: Date | null,   // Last disconnect timestamp
      createdAt: Date,         // ISO date
      updatedAt: Date          // ISO date
      // NOTE: passwordHash is excluded from API response
    },
    statusCode: 200
  }
  ```
- **Error Cases:**
  - `401 Unauthorized` - Invalid/expired JWT

#### PATCH `/users/me`
- **Authentication:** Required (JWT)
- **Input (RequestBody):**
  ```typescript
  {
    username?: string,          // 3-30 chars, alphanumeric + underscore
    newPassword?: string,       // 8-72 chars
    currentPassword?: string    // 1-72 chars (required if newPassword provided)
  }
  ```
- **Output (200 OK):**
  ```typescript
  {
    data: {
      id: string,
      username: string,
      role: "USER" | "ADMIN",
      lastSeen: Date | null,
      createdAt: Date,
      updatedAt: Date
      // passwordHash excluded
    },
    statusCode: 200
  }
  ```
- **Error Cases:**
  - `401 Unauthorized` - Invalid JWT
  - `400 Bad Request` - Invalid validation
  - `409 Conflict` - Username already taken

### DTOs

#### UpdateUserDto
```typescript
interface UpdateUserDto {
  username?: string;           // Min 3, Max 30, Pattern: /^[a-zA-Z0-9_]+$/
  newPassword?: string;        // Min 8, Max 72
  currentPassword?: string;    // Min 1, Max 72 (required if newPassword)
}
```

### User Entity

```typescript
interface User {
  id: string;                      // UUID
  username: string;                // Unique
  passwordHash: string;            // Bcrypt hash (hidden from API)
  role: AppRole;                   // 'USER' | 'ADMIN'
  lastSeen: Date | null;           // Last disconnect timestamp
  createdAt: Date;                 // Auto-generated
  updatedAt: Date;                 // Auto-updated
  
  // Relations (included when queried with relations)
  participations: ConversationParticipant[];
  messages: Message[];
}
```

### Enums

```typescript
enum AppRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}
```

### Service Methods

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `findById(id)` | `string` | `Promise<User>` | Fetch user by ID |
| `update(userId, dto)` | `string, UpdateUserDto` | `Promise<User>` | Update profile/password |

---

## Conversations Module

**Base Route:** `/conversations`
**Location:** `src/conversations/`
**Authentication:** JwtAuthGuard (all endpoints)

### Endpoints

#### POST `/conversations`
- **Authentication:** Required
- **Input (RequestBody):**
  ```typescript
  {
    type: "direct" | "group",       // Required
    
    // For DIRECT:
    targetUserId?: string,          // UUID (required if type='direct')
    
    // For GROUP:
    participants?: string[],        // Array of UUIDs (required if type='group', min 1)
    name?: string,                  // 1-100 chars (group only)
    description?: string,           // 0-500 chars (group only)
    avatar?: string                 // URL/path (group only)
  }
  ```
- **Output (201 Created):**
  ```typescript
  {
    data: {
      id: string,                    // UUID
      type: "direct" | "group",
      name: string | null,
      avatar: string | null,
      description: string | null,
      createdAt: Date,
      updatedAt: Date,
      participants: ConversationParticipant[]  // Full participant objects
    },
    statusCode: 201
  }
  ```
- **Error Cases:**
  - `400 Bad Request` - Invalid validation
  - `404 Not Found` - Target user or participant not found

#### GET `/conversations`
- **Authentication:** Required
- **Query Parameters:** None
- **Output (200 OK):**
  ```typescript
  {
    data: [
      {
        id: string,
        type: "direct" | "group",
        name: string | null,
        avatar: string | null,
        description: string | null,
        createdAt: Date,
        updatedAt: Date,
        participants: ConversationParticipant[]
      }
      // ... more conversations
    ],
    statusCode: 200
  }
  ```
  - **Sorted by:** `updatedAt DESC` (most recent first)
  - **Filtered by:** Only conversations where user is a participant
- **Error Cases:**
  - `401 Unauthorized` - Invalid JWT

#### GET `/conversations/:conversationId`
- **Authentication:** Required
- **Input:** `conversationId` (path parameter, UUID)
- **Output (200 OK):**
  ```typescript
  {
    data: {
      id: string,
      type: "direct" | "group",
      name: string | null,
      avatar: string | null,
      description: string | null,
      createdAt: Date,
      updatedAt: Date,
      participants: ConversationParticipant[]  // With full User objects
    },
    statusCode: 200
  }
  ```
- **Error Cases:**
  - `401 Unauthorized` - Invalid JWT
  - `403 Forbidden` - User not a participant
  - `404 Not Found` - Conversation doesn't exist

#### PATCH `/conversations/:conversationId`
- **Authentication:** Required
- **Authorization:** Requester must be OWNER or ADMIN (group conversations only)
- **Input (RequestBody):**
  ```typescript
  {
    name?: string,              // 1-100 chars
    avatar?: string,            // URL/path
    description?: string        // 0-500 chars
  }
  ```
- **Output (200 OK):**
  ```typescript
  {
    data: {
      id: string,
      type: "direct" | "group",
      name: string | null,
      avatar: string | null,
      description: string | null,
      createdAt: Date,
      updatedAt: Date,
      participants: ConversationParticipant[]
    },
    statusCode: 200
  }
  ```
- **Error Cases:**
  - `401 Unauthorized` - Invalid JWT
  - `403 Forbidden` - User not OWNER/ADMIN
  - `404 Not Found` - Conversation doesn't exist

#### POST `/conversations/:conversationId/participants`
- **Authentication:** Required
- **Authorization:** Requester must be OWNER or ADMIN
- **Input (RequestBody):**
  ```typescript
  {
    userIds: string[]  // Array of UUIDs to invite (min 1)
  }
  ```
- **Output (201 Created):**
  ```typescript
  {
    data: [
      {
        id: string,              // UUID of ConversationParticipant
        conversationId: string,  // Non-relational reference
        userId: string,
        role: "MEMBER",          // Newly added members always get MEMBER role
        joinedAt: Date,
        user?: User              // May include User object
      }
      // ... for each invited user
    ],
    statusCode: 201
  }
  ```
- **Error Cases:**
  - `400 Bad Request` - Invalid userIds
  - `401 Unauthorized` - Invalid JWT
  - `403 Forbidden` - User not OWNER/ADMIN
  - `404 Not Found` - Conversation or user doesn't exist

#### DELETE `/conversations/:conversationId/participants/me`
- **Authentication:** Required
- **Input:** None
- **Output:** 204 No Content (empty body)
- **Effect:** User leaves the group conversation
- **Error Cases:**
  - `401 Unauthorized` - Invalid JWT
  - `403 Forbidden` - User not a participant (or direct conversation)
  - `404 Not Found` - Conversation doesn't exist

#### DELETE `/conversations/:conversationId/participants/:userId`
- **Authentication:** Required
- **Authorization:** Requester must be OWNER or ADMIN
- **Input:** `userId` (path parameter, UUID of participant to remove)
- **Output:** 204 No Content (empty body)
- **Effect:** Specified participant removed from conversation
- **Error Cases:**
  - `401 Unauthorized` - Invalid JWT
  - `403 Forbidden` - User not OWNER/ADMIN
  - `404 Not Found` - Conversation or participant doesn't exist

### DTOs

#### CreateConversationDto
```typescript
interface CreateConversationDto {
  type: 'direct' | 'group';           // Required
  targetUserId?: string;              // UUID - required if type='direct'
  participants?: string[];            // UUID[] - required if type='group', min 1
  name?: string;                      // Min 1, Max 100
  description?: string;               // Max 500
  avatar?: string;                    // URL/path
}
```

#### UpdateConversationDto
```typescript
interface UpdateConversationDto {
  name?: string;                      // Min 1, Max 100
  avatar?: string;
  description?: string;               // Max 500
}
```

#### InviteParticipantsDto
```typescript
interface InviteParticipantsDto {
  userIds: string[];                  // UUIDs array, min 1
}
```

### Entities

#### Conversation Entity
```typescript
interface Conversation {
  id: string;                         // UUID
  type: ConversationType;             // 'direct' | 'group'
  name: string | null;                // Group conversations only
  avatar: string | null;              // Group conversations only
  description: string | null;         // Group conversations only
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  participants: ConversationParticipant[];
  messages: Message[];
}
```

#### ConversationParticipant Entity
```typescript
interface ConversationParticipant {
  id: string;                         // UUID
  conversation: Conversation;         // FK relation
  conversationId: string;             // Foreign key
  user: User;                         // FK relation
  userId: string;                     // Foreign key
  role: ConversationRole;             // 'OWNER' | 'ADMIN' | 'MEMBER'
  joinedAt: Date;
}
```

### Enums

```typescript
enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group'
}

enum ConversationRole {
  OWNER = 'OWNER',    // Created the conversation (group only)
  ADMIN = 'ADMIN',    // Can manage participants and settings
  MEMBER = 'MEMBER'   // Regular participant
}
```

### Service Methods

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `create(actor, dto)` | `User, CreateConversationDto` | `Promise<Conversation>` | Create conversation with participants |
| `findAllForUser(actor)` | `User` | `Promise<Conversation[]>` | Get all user's conversations |
| `findOne(actor, conversationId)` | `User, string` | `Promise<Conversation>` | Get single conversation (with auth check) |
| `update(actor, conversationId, dto)` | `User, string, UpdateConversationDto` | `Promise<Conversation>` | Update group metadata |
| `inviteParticipants(actor, conversationId, dto)` | `User, string, InviteParticipantsDto` | `Promise<ConversationParticipant[]>` | Add users to group |
| `removeParticipant(actor, conversationId, userId)` | `User, string, string` | `Promise<void>` | Remove participant |
| `leaveConversation(actor, conversationId)` | `User, string` | `Promise<void>` | User leaves group |
| `getParticipantRole(userId, conversationId)` | `string, string` | `Promise<ConversationRole \| null>` | Get user's role |

---

## Messages Module

**Base Route:** `/conversations/:conversationId/messages`
**Location:** `src/messages/`
**Authentication:** JwtAuthGuard (all endpoints)

### Endpoints

#### POST `/conversations/:conversationId/messages`
- **Authentication:** Required
- **Authorization:** User must be participant of conversation
- **Throttling:** 30 requests/min per user
- **Input (RequestBody):**
  ```typescript
  {
    content: string,            // 1-4000 chars (required)
    replyToMessageId?: string   // UUID of message to reply to (optional)
  }
  ```
- **Output (201 Created):**
  ```typescript
  {
    data: {
      id: string,                      // UUID
      conversationId: string,          // FK
      content: string,
      author: User,                    // Nested User object
      replyToId: string | null,
      replyTo: Message | null,         // Nested reply message if exists
      editedAt: Date | null,           // null = not edited
      deletedAt: Date | null,          // null = active
      createdAt: Date,
      updatedAt: Date,
      version: number                  // Optimistic lock
    },
    statusCode: 201
  }
  ```
- **WebSocket Event:** `message.created` emitted to conversation room
- **Error Cases:**
  - `400 Bad Request` - Invalid validation
  - `401 Unauthorized` - Invalid JWT
  - `403 Forbidden` - User not participant
  - `404 Not Found` - Conversation or replyTo message not found
  - `429 Too Many Requests` - Throttled

#### GET `/conversations/:conversationId/messages`
- **Authentication:** Required
- **Authorization:** User must be participant
- **Query Parameters:**
  ```typescript
  {
    cursor?: string,    // Message ID to start from (optional)
    limit?: number      // 1-100 (default: 50)
  }
  ```
- **Output (200 OK):**
  ```typescript
  {
    data: {
      data: [
        {
          id: string,
          conversationId: string,
          content: string,
          author: User,
          replyToId: string | null,
          replyTo: Message | null,      // If replying to another message
          editedAt: Date | null,
          deletedAt: Date | null,       // null = active messages only
          createdAt: Date,
          updatedAt: Date,
          version: number
        }
        // ... more messages
      ],
      nextCursor: string | null         // null if no more messages
    },
    statusCode: 200
  }
  ```
  - **Pagination:** Cursor-based (by message ID)
  - **Sorting:** `createdAt DESC` (newest first)
  - **Filtering:** Only non-deleted messages returned
- **Error Cases:**
  - `401 Unauthorized` - Invalid JWT
  - `403 Forbidden` - User not participant
  - `404 Not Found` - Conversation doesn't exist

#### PATCH `/conversations/:conversationId/messages/:messageId`
- **Authentication:** Required
- **Authorization:** User must be message author
- **Input (RequestBody):**
  ```typescript
  {
    content: string     // 1-4000 chars (required)
  }
  ```
- **Output (200 OK):**
  ```typescript
  {
    data: {
      id: string,
      conversationId: string,
      content: string,        // Updated content
      author: User,
      replyToId: string | null,
      replyTo: Message | null,
      editedAt: Date,         // NOW set (was null before edit)
      deletedAt: Date | null,
      createdAt: Date,
      updatedAt: Date,
      version: number         // Incremented for optimistic lock
    },
    statusCode: 200
  }
  ```
- **WebSocket Event:** `message.updated` emitted to conversation room
- **Error Cases:**
  - `400 Bad Request` - Invalid validation
  - `401 Unauthorized` - Invalid JWT
  - `403 Forbidden` - User not author
  - `404 Not Found` - Message or conversation doesn't exist

#### DELETE `/conversations/:conversationId/messages/:messageId`
- **Authentication:** Required
- **Authorization:** User must be author or OWNER/ADMIN of conversation
- **Input:** None
- **Output:** 204 No Content (empty body)
- **Effect:** Message soft-deleted (sets `deletedAt` timestamp)
- **WebSocket Event:** `message.deleted` { messageId } emitted to conversation room
- **Error Cases:**
  - `401 Unauthorized` - Invalid JWT
  - `403 Forbidden` - User not author or admin
  - `404 Not Found` - Message or conversation doesn't exist

### DTOs

#### SendMessageDto
```typescript
interface SendMessageDto {
  content: string;            // Min 1, Max 4000
  replyToMessageId?: string;  // UUID of message to reply to
}
```

#### EditMessageDto
```typescript
interface EditMessageDto {
  content: string;            // Min 1, Max 4000
}
```

#### ListMessagesDto
```typescript
interface ListMessagesDto {
  cursor?: string;            // Message ID to start from
  limit?: number;             // Min 1, Max 100, default 50
}
```

### Message Entity

```typescript
interface Message {
  id: string;                         // UUID
  conversation: Conversation;         // FK relation
  conversationId: string;
  author: User;                       // FK relation
  authorId: string;
  content: string;                    // Message text
  replyTo: Message | null;            // FK relation (nullable)
  replyToId: string | null;           // Denormalized FK
  editedAt: Date | null;              // null if never edited
  deletedAt: Date | null;             // null if active
  createdAt: Date;                    // Indexed
  updatedAt: Date;
  version: number;                    // Optimistic lock counter
}
```

### Service Methods

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `send(actor, conversationId, dto)` | `User, string, SendMessageDto` | `Promise<Message>` | Create message, emit WebSocket |
| `list(actor, conversationId, query)` | `User, string, ListMessagesDto` | `Promise<MessagePage>` | Cursor-paginated list |
| `edit(actor, conversationId, messageId, dto)` | `User, string, string, EditMessageDto` | `Promise<Message>` | Update content, set editedAt |
| `delete(actor, conversationId, messageId)` | `User, string, string` | `Promise<void>` | Soft delete message |

---

## WebSocket Gateway

**Namespace:** `/chat`
**Location:** `src/gateway/`
**CORS:** `{ origin: '*' }`
**Authentication:** JWT Bearer token (from headers or query)

### Connection Flow

1. Client connects with JWT token (header or query parameter)
2. Token verified and User loaded from database
3. User auto-joined to all conversation rooms they participate in
4. If first socket connection → emit `user.online` to joined rooms
5. On last socket disconnect → update `lastSeen` timestamp, emit `user.offline`

### Gateway Events (Server → Client)

#### Presence Events

```typescript
// User comes online (first socket connects)
{
  event: 'user.online',
  data: {
    userId: string,           // UUID
    username: string,
    timestamp: Date           // ISO date when user connected
  }
}

// User goes offline (last socket disconnects)
{
  event: 'user.offline',
  data: {
    userId: string,
    username: string,
    lastSeen: string          // ISO date when user disconnected
  }
}
```

#### Message Events

```typescript
// New message created
{
  event: 'message.created',
  data: Message              // Full Message object
}

// Message edited
{
  event: 'message.updated',
  data: Message              // Updated Message object
}

// Message deleted
{
  event: 'message.deleted',
  data: {
    messageId: string        // UUID
  }
}
```

#### Conversation Events

```typescript
// Conversation metadata updated
{
  event: 'conversation.updated',
  data: unknown              // Payload from service
}

// Participant added to group
{
  event: 'conversation.participant_added',
  data: unknown              // Payload from service
}

// Participant removed from group
{
  event: 'conversation.participant_removed',
  data: {
    userId: string
  }
}

// Participant left group
{
  event: 'conversation.participant_left',
  data: {
    userId: string
  }
}
```

### Client → Server Commands

#### Room Management

```typescript
// Join conversation room (subscribe to messages)
@SubscribeMessage('conversation:join')
handleJoinConversation(
  @MessageBody() data: { conversationId: string }
): void

// Leave conversation room (unsubscribe from messages)
@SubscribeMessage('conversation:leave')
handleLeaveConversation(
  @MessageBody() data: { conversationId: string }
): void
```

### Gateway Service Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `emitMessageCreated` | conversationId, message | Broadcast new message to room |
| `emitMessageUpdated` | conversationId, message | Broadcast edited message |
| `emitMessageDeleted` | conversationId, { messageId } | Broadcast deletion |
| `emitConversationUpdated` | conversationId, payload | Broadcast conversation changes |
| `emitParticipantAdded` | conversationId, payload | Broadcast participant addition |
| `emitParticipantRemoved` | conversationId, { userId } | Broadcast removal |
| `emitParticipantLeft` | conversationId, { userId } | Broadcast leaving |
| `joinUserToConversation` | userId, conversationId | Join all user sockets to room |
| `leaveUserFromConversation` | userId, conversationId | Remove user from room |

### Room Names

Rooms follow the pattern: `conversation-{conversationId}`

Users are automatically subscribed to all rooms for conversations they're participants in.

---

## Common Module

**Location:** `src/common/`

### Global Exception Filter

All unhandled exceptions follow this response format:

```typescript
{
  statusCode: number,         // HTTP status code
  timestamp: string,          // ISO date: "2026-04-15T10:30:45.123Z"
  path: string,               // Request URL path
  message: unknown            // HttpException.getResponse() or error string
}
```

**Status Code Mapping:**
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Missing/invalid JWT
- `403 Forbidden` - Insufficient permissions (roles, ownership)
- `404 Not Found` - Resource not found
- `409 Conflict` - Violation of unique constraints
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Unhandled exceptions

### Transform Interceptor

All successful responses are wrapped:

```typescript
{
  data: T,                    // Actual response body
  statusCode: number          // 200, 201, etc.
}
```

### Decorators

```typescript
// Extract authenticated user from JWT payload
@CurrentUser(): User

// Mark endpoint with required roles (checked by RolesGuard)
@Roles('ADMIN'): void
```

### Guards

```typescript
// Validates JWT token, injects user into request
JwtAuthGuard

// Checks user.role against @Roles() decorator
RolesGuard
```

---

## Root Endpoint

```typescript
GET /
Response (200 OK):
{
  data: "Hello from NestJS App",
  statusCode: 200
}
```

---

## Key Patterns & Conventions

### Authentication
- **JWT Token:** Bearer token in `Authorization: Bearer <token>` header
- **Payload:** `{ sub: userId, username: string }`
- **Guard:** `JwtAuthGuard` validates and injects `@CurrentUser()`

### Authorization
- **Ownership:** Actions check `actor.id === resource.author.id`
- **Roles:** `@Roles('ADMIN', 'USER')` metadata + `RolesGuard`
- **Conversation Roles:** OWNER, ADMIN, MEMBER with different privileges

### Pagination
- **Messages:** Cursor-based pagination (by `messageId`)
- **Conversations:** No pagination (return all user's conversations)
- **Order:** Usually DESC by `updatedAt` or `createdAt`

### Soft Deletes
- **Messages:** Set `deletedAt` timestamp (not physically removed)
- **API Returns:** Only non-deleted messages
- **WebSocket:** Emits `message.deleted` event

### Optimistic Locking
- **Messages:** `version` field incremented on edit
- **Support for:** Preventing conflicting updates

### Relations
- **Eager Loading:** Most endpoints load related objects (User, Message, etc.)
- **Security:** `passwordHash` always stripped from User objects
- **Lazy Relations:** Can extend as needed in future

### Rate Limiting
- **Register:** 5 requests/min
- **Login:** 10 requests/min
- **Send Message:** 30 requests/min

---

## Response Type Hierarchy

```
┌─ TransformInterceptor Wrapper
│  ├─ statusCode: number
│  └─ data: T
│     ├─ User
│     │  ├─ id, username, role, lastSeen, timestamps
│     │  └─ Relations: participations[], messages[]
│     ├─ Conversation
│     │  ├─ id, type, name, avatar, description, timestamps
│     │  └─ participants: ConversationParticipant[]
│     ├─ ConversationParticipant
│     │  ├─ id, userId, role, joinedAt
│     │  └─ Relations: user, conversation
│     ├─ Message
│     │  ├─ id, content, editedAt, deletedAt, version, timestamps
│     │  └─ Relations: author, replyTo
│     ├─ MessagePage
│     │  ├─ data: Message[]
│     │  └─ nextCursor: string | null
│     └─ { accessToken: string }
│
└─ HttpExceptionFilter (on error)
   ├─ statusCode: number
   ├─ timestamp: Date
   ├─ path: string
   └─ message: unknown
```

---

## WebSocket Event Summary

**Broadcasting to Conversation Room:**
- `user.online` / `user.offline`
- `message.created` / `message.updated` / `message.deleted`
- `conversation.updated`
- `conversation.participant_added` / `conversation.participant_removed` / `conversation.participant_left`

**Room Subscription:**
- Client joins: `conversation:join` 
- Client leaves: `conversation:leave`

---

## Database Relationships

```
User (1) ────────── (M) ConversationParticipant ────────── (M) Conversation
         participations              (many-to-many)             (group with metadata)
  │
  └─── (M) Message (author)

Conversation (1) ────────── (M) ConversationParticipant
  │                          │
  └─ (M) Message ────→ (1) User (author)
                            │
                     (optional) Message (replyTo) ← Self-referential
```

---

**Generated:** April 15, 2026
**Version:** 1.0
**Scope:** Complete NestJS backend response documentation
