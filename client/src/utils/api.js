const API_URL = 'http://localhost:3000';

const getToken = () => localStorage.getItem('token');
const getGuestToken = () => localStorage.getItem('guestToken');

const fetchApi = async (endpoint, options = {}) => {
    const token = getToken() || getGuestToken();
    
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
        register: (data) => fetchApi('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
        login: (data) => fetchApi('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
        guest: () => fetchApi('/auth/guest', { method: 'POST' }),
    },
    tests: {
        list: () => fetchApi('/tests'),
        get: (slug) => fetchApi(`/tests/${slug}`),
        questions: (slug, lang = 'fa') => fetchApi(`/tests/${slug}/questions?lang=${lang}`),
        createSession: (slug, data) => fetchApi(`/tests/${slug}/session`, { method: 'POST', body: JSON.stringify(data) }),
        submitAnswers: (slug, data) => fetchApi(`/tests/${slug}/answers`, { method: 'POST', body: JSON.stringify(data) }),
        getSession: (slug, sessionId) => fetchApi(`/tests/${slug}/session/${sessionId}`),
    },
    results: {
        get: (slug, sessionId) => fetchApi(`/results/${slug}/result/${sessionId}`),
        my: (testSlug) => fetchApi(`/results/my${testSlug ? `?testSlug=${testSlug}` : ''}`),
    },
};

export default api;