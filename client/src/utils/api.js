const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const getToken = () => localStorage.getItem('token');
const getGuestToken = () => localStorage.getItem('guestToken');

const fetchApi = async (endpoint, options = {}) => {
  const token = getToken() || getGuestToken() || '';
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'خطا در ارتباط با سرور');
  }

  return data;
};

export const api = {
  auth: {
    register: (data) => 
      fetchApi('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => 
      fetchApi('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    guest: () => 
      fetchApi('/auth/guest', { method: 'POST' }),
    logout: () =>
      fetchApi('/auth/logout', { method: 'POST' }),
  },
  tests: {
    list: (page, limit) => 
      fetchApi(`/tests?page=${page || 1}&limit=${limit || 10}`),
    get: (slug) => 
      fetchApi(`/tests/${slug}`),
    checkIncompleteSession: (slug) =>
      fetchApi(`/tests/${slug}/incomplete-session`),
    currentQuestion: (slug, sessionId) =>
      fetchApi(`/tests/${slug}/current-question?sessionId=${sessionId}`),
    createSession: (slug, data) => 
      fetchApi(`/tests/${slug}/session`, { method: 'POST', body: JSON.stringify(data) }),
    submitOneAnswer: (slug, data) =>
      fetchApi(`/tests/${slug}/submit-answer`, { method: 'POST', body: JSON.stringify(data) }),
    submitAnswers: (slug, data) => 
      fetchApi(`/tests/${slug}/answers`, { method: 'POST', body: JSON.stringify(data) }),
    getSession: (slug, sessionId) => 
      fetchApi(`/tests/${slug}/session/${sessionId}`),
  },
  results: {
    get: (slug, sessionId) => 
      fetchApi(`/results/${slug}/result/${sessionId}`),
    my: (testSlug, page, limit) => 
      fetchApi(`/results/my${testSlug ? `?testSlug=${testSlug}&` : '?'}page=${page || 1}&limit=${limit || 10}`),
    myIncomplete: () =>
      fetchApi('/results/my/incomplete'),
    delete: (id) =>
      fetchApi(`/results/${id}`, { method: 'DELETE' }),
  },
  scoring: {
    calculate: (data) =>
      fetchApi('/results/calculate', { method: 'POST', body: JSON.stringify(data) }),
    share: (data) =>
      fetchApi('/results/share', { method: 'POST', body: JSON.stringify(data) }),
  },
  admin: {
    sharedResults: (page, limit) =>
      fetchApi(`/results/admin/shared?page=${page || 1}&limit=${limit || 20}`),
  },
};

export default api;
