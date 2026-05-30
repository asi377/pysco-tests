const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const getToken = (): string | null => localStorage.getItem('token');
const getGuestToken = (): string | null => localStorage.getItem('guestToken');

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  [key: string]: any;
}

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

const fetchApi = async <T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
  const token = getToken() || getGuestToken() || '';
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'خطا در ارتباط با سرور');
  }

  return data as T;
};

export const api = {
  auth: {
    register: (data: { fullName: string; email: string; password: string; guestToken?: string }) => 
      fetchApi('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) => 
      fetchApi('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    guest: () => 
      fetchApi('/auth/guest', { method: 'POST' }),
  },
  tests: {
    list: (page?: number, limit?: number) => 
      fetchApi(`/tests?page=${page || 1}&limit=${limit || 10}`),
    get: (slug: string) => 
      fetchApi(`/tests/${slug}`),
    questions: (slug: string, lang: string = 'fa', page?: number, limit?: number) => 
      fetchApi(`/tests/${slug}/questions?lang=${lang}&page=${page || 1}&limit=${limit || 50}`),
    createSession: (slug: string, data: object) => 
      fetchApi(`/tests/${slug}/session`, { method: 'POST', body: JSON.stringify(data) }),
    submitAnswers: (slug: string, data: { sessionId: string; answers: Array<{ questionId: string; answer: number }> }) => 
      fetchApi(`/tests/${slug}/answers`, { method: 'POST', body: JSON.stringify(data) }),
    getSession: (slug: string, sessionId: string) => 
      fetchApi(`/tests/${slug}/session/${sessionId}`),
  },
  results: {
    get: (slug: string, sessionId: string) => 
      fetchApi(`/results/${slug}/result/${sessionId}`),
    my: (testSlug?: string, page?: number, limit?: number) => 
      fetchApi(`/results/my${testSlug ? `?testSlug=${testSlug}&` : '?'}page=${page || 1}&limit=${limit || 10}`),
  },
};

export default api;