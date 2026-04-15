import axios, { AxiosError } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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
// On 401 from authenticated endpoints, clear token and redirect to login.
// Auth endpoints (/auth/*) legitimately return 401 for wrong credentials —
// don't redirect from those.
apiClient.interceptors.response.use(
  (res) => res,
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
  getMe: () => apiClient.get('/users/me'),
  updateMe: (data: { username?: string; password?: string }) =>
    apiClient.patch('/users/me', data),
};

// --- Conversations ---
export const conversationsApi = {
  list: () => apiClient.get('/conversations'),
  get: (id: string) => apiClient.get(`/conversations/${id}`),
  createDirect: (targetUserId: string) =>
    apiClient.post('/conversations', { type: 'direct', targetUserId }),
  createGroup: (name: string, participants: string[]) =>
    apiClient.post('/conversations', { type: 'group', name, participants }),
  updateGroup: (id: string, data: { name?: string; avatar?: string; description?: string }) =>
    apiClient.patch(`/conversations/${id}`, data),
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
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (typeof data?.error === 'string') return data.error;
  }
  return fallback;
}
