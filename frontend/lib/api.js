const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export class ApiClientError extends Error {
  constructor({ statusCode, code, message, details }) {
    super(message || 'An error occurred during the API request');
    this.name = 'ApiClientError';
    this.statusCode = statusCode || 500;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details || [];
  }
}

function getStoredToken() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('elite_token');
  } catch {
    return null;
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = options.token || getStoredToken();

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (_err) {
    throw new ApiClientError({
      statusCode: 0,
      code: 'NETWORK_ERROR',
      message: 'Não foi possível conectar ao servidor. Verifique se o backend está em execução.',
    });
  }

  if (response.status === 204) {
    return null;
  }

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorPayload = typeof data === 'object' && data !== null ? data : {};
    throw new ApiClientError({
      statusCode: response.status,
      code: errorPayload.code || (response.status === 401 ? 'UNAUTHORIZED' : response.status === 403 ? 'FORBIDDEN' : 'API_ERROR'),
      message: errorPayload.message || response.statusText || 'Erro na requisição',
      details: errorPayload.details || [],
    });
  }

  return data;
}

export const api = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => request(endpoint, { method: 'POST', body, ...options }),
  patch: (endpoint, body, options) => request(endpoint, { method: 'PATCH', body, ...options }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),

  // Reservations
  createReservation: (eventId, quantity) =>
    request('/reservations', { method: 'POST', body: { eventId, quantity } }),
  getReservation: (reservationId) =>
    request(`/reservations/${reservationId}`, { method: 'GET' }),

  // Payments
  processPayment: (reservationId, simulation) =>
    request(`/reservations/${reservationId}/payment`, {
      method: 'POST',
      body: { simulation },
    }),

  // Tickets
  getMyTickets: (page = 1, limit = 20) =>
    request(`/me/tickets?page=${page}&limit=${limit}`, { method: 'GET' }),
  getMyTicket: (ticketId) =>
    request(`/me/tickets/${ticketId}`, { method: 'GET' }),
};

export default api;
