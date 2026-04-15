export type ConversationType = 'direct' | 'group';
export type ConversationRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type AppRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  lastSeen: string | null;
  role: AppRole;
}

export interface ConversationParticipant {
  id?: string;
  conversationId?: string;
  userId: string;
  user: User;
  role: ConversationRole;
  joinedAt: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;
  avatar: string | null;
  description: string | null;
  participants: ConversationParticipant[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  authorId: string;
  author: Pick<User, 'id' | 'username'>;
  content: string;
  replyToMessageId: string | null;
  replyTo: Pick<Message, 'id' | 'content' | 'authorId'> | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}

export interface MessagePage {
  data: Message[];
  nextCursor: string | null;
}

export interface PresenceMap {
  [userId: string]: boolean;
}
