const TOKEN_KEY = 'vot.token';

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error ?? `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

export const api = {
  login: (username, password) => request('/login', { method: 'POST', body: { username, password } }),
  logout: () => request('/logout', { method: 'POST' }),
  me: () => request('/me'),
  config: () => request('/config'),
  vendors: () => request('/vendors'),
  vendor: (id) => request(`/vendors/${id}`),
  changeStage: (id, body) => request(`/vendors/${id}/stage`, { method: 'POST', body }),
  addNote: (id, note) => request(`/vendors/${id}/notes`, { method: 'POST', body: { note } }),
  rejectKyc: (id, reason) => request(`/vendors/${id}/kyc-rejection`, { method: 'POST', body: { reason } }),
  activity: () => request('/activity'),
};
