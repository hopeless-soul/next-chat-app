import axios, { AxiosError } from 'axios';
import type { Conversation, User } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ── Response envelope type ──────────────────────────────────────────────────
// Backend wraps all responses in { data: T, statusCode: number }
// The response interceptor unwraps this automatically.
export interface ApiResponse<T = unknown> {
  data: T;
  statusCode: number;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token management ─────────────────────────────────────────────────────────
// Sets the Authorization default header on the axios instance directly —
// more reliable than reading sessionStorage inside the interceptor.
export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

// ── Request interceptor ──────────────────────────────────────────────────────
// Belt-and-suspenders: if the default header isn't present (e.g. module
// reloaded before setAuthToken was called), fall back to sessionStorage.
apiClient.interceptors.request.use((config) => {
  if (!config.headers.get('Authorization') && typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('accessToken');
    if (stored) {
      config.headers.set('Authorization', `Bearer ${stored}`);
    }
  }
  return config;
});

// ── Response interceptor ─────────────────────────────────────────────────────
// Backend wraps responses in { data: T, statusCode: number }.
// Unwrap to return just T, so client code gets the actual data directly.
// Also handles 401 logout on authenticated endpoints (auth endpoints allow 401).
apiClient.interceptors.response.use(
  (res) => {
    // Unwrap the response envelope: return the data property directly
    if (res.data && typeof res.data === 'object' && 'data' in res.data && 'statusCode' in res.data) {
      res.data = res.data.data;
    }
    return res;
  },
  (error: AxiosError) => {
    const url = error.config?.url ?? '';
    const isAuthEndpoint = url.includes('/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint && typeof window !== 'undefined') {
      setAuthToken(null);
      sessionStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);


// --- Auth ---
export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<{ accessToken: string }>('/auth/login', { username, password }),
  register: (username: string, password: string) =>
    apiClient.post<{ accessToken: string }>('/auth/register', { username, password }),
};

// --- Users ---
export const usersApi = {
  getMe: () => apiClient.get<User>('/users/me'),
  updateMe: (data: { username?: string; password?: string }) =>
    apiClient.patch<User>('/users/me', data),
};

// --- Conversations ---
export const conversationsApi = {
  list: () => apiClient.get<Conversation[]>('/conversations'),
  get: (id: string) =>
    apiClient.get<Conversation>(
      `/conversations/${id}`,
    ),
  createDirect: (targetUserId: string) =>
    apiClient.post<Conversation>(
      '/conversations',
      { type: 'direct', targetUserId },
    ),
  createGroup: (name: string, participants: string[]) =>
    apiClient.post<Conversation>(
      '/conversations',
      { type: 'group', name, participants },
    ),
  updateGroup: (
    id: string,
    data: { name?: string; avatar?: string; description?: string },
  ) =>
    apiClient.patch<Conversation>(
      `/conversations/${id}`,
      data,
    ),
};

// --- Participants ---
export const participantsApi = {
  invite: (conversationId: string, userIds: string[]) =>
    apiClient.post(`/conversations/${conversationId}/participants`, { userIds }),
  remove: (conversationId: string, userId: string) =>
    apiClient.delete(`/conversations/${conversationId}/participants/${userId}`),
  leave: (conversationId: string) =>
    apiClient.delete(`/conversations/${conversationId}/participants/me`),
};

// --- Messages ---
export const messagesApi = {
  list: (conversationId: string, cursor?: string, limit = 50) =>
    apiClient.get(`/conversations/${conversationId}/messages`, {
      params: { ...(cursor ? { cursor } : {}), limit },
    }),
  send: (conversationId: string, content: string, replyToMessageId?: string) =>
    apiClient.post(`/conversations/${conversationId}/messages`, {
      content,
      ...(replyToMessageId ? { replyToMessageId } : {}),
    }),
  edit: (conversationId: string, messageId: string, content: string) =>
    apiClient.patch(`/conversations/${conversationId}/messages/${messageId}`, { content }),
  delete: (conversationId: string, messageId: string) =>
    apiClient.delete(`/conversations/${conversationId}/messages/${messageId}`),
};

// Helper: extract error message string from AxiosError
// Handles both wrapped { data, statusCode } and unwrapped error responses
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    
    // Check if wrapped in { data, statusCode } format
    if (data && typeof data === 'object' && 'data' in data) {
      const wrappedData = (data as any).data;
      if (typeof wrappedData?.message === 'string') return wrappedData.message;
      if (Array.isArray(wrappedData?.message)) return wrappedData.message.join(', ');
      if (typeof wrappedData?.error === 'string') return wrappedData.error;
    }
    
    // Check unwrapped error format
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (typeof data?.error === 'string') return data.error;
  }
  return fallback;
}
