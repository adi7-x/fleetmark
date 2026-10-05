// src/services/api.js
import { translate } from '../context/TranslationContext';

// Base API url (include version, no trailing slash)
export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');
const API_URL = API_BASE;

// Build absolute endpoint, avoiding duplicate slashes
const buildUrl = (endpoint) => {
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  return `${API_URL}/${cleanEndpoint}`;
};

// ── Access token: held in memory only, never localStorage ──────────────────
// The refresh token (the long-lived, dangerous-if-leaked credential) lives
// in an HttpOnly cookie the backend sets — JS never sees it at all. The
// access token still has to be readable by JS (it goes on the Authorization
// header), but keeping it in memory instead of localStorage means it
// doesn't survive a reload/new tab and isn't sitting on disk for anything
// that can read localStorage without running JS on the page.
let accessToken = null;
export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token;
};

// Helper to get auth headers
const getAuthHeaders = () => {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

// Logout helper — clear in-memory token + cached user, redirect
const forceLogout = () => {
  setAccessToken(null);
  localStorage.removeItem('fleetmark_user');
  window.location.replace('/');
};

// Attempt to refresh the JWT access token using the HttpOnly refresh
// cookie. The cookie is sent automatically by the browser (credentials:
// 'include') — there is no refresh token in JS to send explicitly.
let refreshPromise = null;
const tryRefreshToken = async () => {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(buildUrl('auth/token/refresh/'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      // Only a 401/403 means the session is really gone. A 429, a 5xx or a
      // network blip must not sign the user out.
      if (res.status === 401 || res.status === 403) return 'denied';
      if (!res.ok) return 'error';

      const data = await res.json();
      if (data.access) {
        setAccessToken(data.access);
        return 'ok';
      }
      return 'denied';
    } catch {
      return 'error';
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Fetch wrapper that retries on 401 after refreshing the token
const fetchWithRefresh = async (url, config) => {
  let response = await fetch(url, config);

  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed === 'ok') {
      // Rebuild headers with new token
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${getAccessToken()}`,
      };
      response = await fetch(url, config);
    } else if (refreshed === 'denied') {
      forceLogout();
      throw new Error('Session expired. Please log in again.');
    }
  }

  return response;
};

// Drop-in replacement for fetch() on authenticated calls. Pages that call
// fetch directly used to keep sending the token they captured at render
// time, so everything failed once the 60-min access token expired. This
// always sends the current token and refreshes + retries once on a 401.
export const authFetch = (url, init = {}) =>
  fetchWithRefresh(url, { ...init, headers: { ...init.headers, ...getAuthHeaders() } });

// The backend answers in English; the messages a user can actually hit are
// mapped to translation keys so French users read French.
const SERVER_MESSAGES = {
  'You already have a reservation for this day.': 'srvAlreadyBooked',
  'No seats available.': 'srvNoSeats',
  'Trip is no longer available.': 'srvTripGone',
  'Already reserved.': 'srvAlreadyReserved',
  'Cannot cancel a reservation for an archived trip.': 'srvCannotCancelArchived',
  'Trip not found.': 'srvTripNotFound',
  'Invalid code.': 'twoFaInvalidCode',
  'Bus system only works between 21:00 and 06:00, with 02:00 break disabled.': 'srvTripHours',
  'A trip for this route and time already exists.': 'srvTripDuplicate',
  'Driver is assigned to trips and has been set to inactive.': 'srvDriverDeactivated',
  'Bus is referenced by one or more trips.': 'srvBusInUse',
  'Route is referenced by one or more trips.': 'srvRouteInUse',
  'Station is referenced by one or more routes.': 'srvStationInUse',
  'Add at least one active driver before generating trips.': 'srvNeedDriver',
  'One or more stations do not exist or are duplicated.': 'srvBadStations',
  'A route must have at least one station.': 'srvRouteNeedsStation',
  'You cannot change your own role or deactivate yourself.': 'usersSelfLocked',
  'This account has been deactivated.': 'srvDeactivated',
  'Only trips that have already departed can be archived.': 'srvArchiveFuture',
  'The main administrator account cannot be demoted or blocked.': 'srvRootAdmin',
};
const localise = (msg) => (SERVER_MESSAGES[msg] ? translate(SERVER_MESSAGES[msg]) : msg);

// Best human-readable message from a failed response: DRF puts it in
// `detail`, or in per-field arrays ({"name": ["..."]}).
export const errorMessage = async (res, fallback) => {
  const data = await res.json().catch(() => null);
  if (!data) return fallback;
  if (typeof data === 'string') return localise(data);
  if (data.detail || data.error) return localise(data.detail || data.error);
  const first = Object.values(data).flat().find((v) => typeof v === 'string');
  return first ? localise(first) : fallback;
};

// Generic API call function
const apiCall = async (endpoint, options = {}) => {
  const url = buildUrl(endpoint);
  const config = {
    ...options,
    // Spread `options` first: it carries a `headers` key of its own, and
    // spreading it last would replace the merged object below wholesale —
    // silently dropping the Authorization header from any caller that
    // passes headers of its own.
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  };

  try {
    const response = await fetchWithRefresh(url, config);
    
    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    const data = await response.json();
    
    if (!response.ok) {
        const message = data.detail || data.error ||
        (typeof data === 'object' ? Object.values(data).flat().join(', ') : null) ||
        `HTTP ${response.status}`;
      throw new Error(localise(message));
    }
    
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};

// Authentication API
export const auth = {
  // Get OAuth login URL
  getLoginUrl: () => apiCall('auth/42/login/'),

  // Get current user profile
  getProfile: () => apiCall('auth/me/'),

  // Update user profile
  updateProfile: (data) => apiCall('auth/me/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  // Get all users (admin only)
  getUsers: () => apiCall('auth/users/'),

  // Called by AuthCallback once the OAuth redirect hands us an access
  // token (non-2FA path). Stores the token in memory and caches the user
  // for instant paint on the next load.
  completeLogin: (access, user) => {
    setAccessToken(access);
    localStorage.setItem('fleetmark_user', JSON.stringify(user));
  },

  // Second half of a 2FA login: exchange the short-lived pre-auth token
  // (from the OAuth callback) plus a TOTP code for the real session. On
  // success the backend sets the refresh cookie; we still need to store
  // the access token client-side ourselves.
  verifyTotpLogin: async (preauth, code) => {
    const res = await fetch(buildUrl('auth/2fa/login-verify/'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preauth, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || 'Invalid code.');
    }
    setAccessToken(data.access);
    localStorage.setItem('fleetmark_user', JSON.stringify(data.user));
    return data.user;
  },

  // Called once on app boot to recover a session from the refresh cookie
  // (the access token itself never survives a reload — it's memory-only).
  // Returns the user on success, null if there's no valid session.
  restoreSession: async () => {
    // The refresh cookie is HttpOnly, so JS cannot test for it directly.
    // The cached user is the next best signal: it is written on login and
    // on every successful restore, and cleared on logout. With no cached
    // user there is no session to recover, and asking anyway costs a
    // request that can only ever 401 — one on every visit to the landing
    // page and the legal pages, each logging a red error in the console
    // and spending the caller's rate-limit budget.
    if (!localStorage.getItem('fleetmark_user')) return null;

    const refreshed = await tryRefreshToken();
    if (refreshed === 'denied') return null;
    // Server or network hiccup: keep the cached user instead of signing them
    // out; the next API call retries the refresh.
    if (refreshed === 'error') return getUser();
    try {
      return await apiCall('auth/me/');
    } catch {
      return null;
    }
  },

  // Logout: clears the refresh cookie server-side (JS can't touch an
  // HttpOnly cookie itself), then drops the in-memory token + cached user.
  logout: async () => {
    try {
      await fetch(buildUrl('auth/logout/'), {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Best-effort — still clear local state even if the request fails.
    }
    setAccessToken(null);
    localStorage.removeItem('fleetmark_user');
    localStorage.removeItem('fleetmark_access');
    localStorage.removeItem('fleetmark_refresh');
  }
};

// Stations API
export const stations = {
  list: () => apiCall('stations/'),
  create: (data) => apiCall('stations/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`stations/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`stations/${id}/`, { method: 'DELETE' }),
};

// Buses API
export const buses = {
  list: () => apiCall('buses/'),
  create: (data) => apiCall('buses/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`buses/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`buses/${id}/`, { method: 'DELETE' }),
};

// Drivers API
export const drivers = {
  list: () => apiCall('drivers/'),
  create: (data) => apiCall('drivers/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`drivers/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`drivers/${id}/`, { method: 'DELETE' }),
};

// Trips API
export const trips = {
  list: () => apiCall('trips/'),
  available: (stationId) => apiCall(`trips/available/?station_id=${stationId}`),
  create: (data) => apiCall('trips/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`trips/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`trips/${id}/`, { method: 'DELETE' }),
};

// Reservations API
export const reservations = {
  list: (userId = null) => {
    const endpoint = userId ? `reservations/?user_id=${userId}` : 'reservations/';
    return apiCall(endpoint);
  },
  history: (userId = null) => {
    const endpoint = userId ? `reservations/history/?user_id=${userId}` : 'reservations/history/';
    return apiCall(endpoint);
  },
  create: (data) => apiCall('reservations/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  delete: (id) => {
    return apiCall(`reservations/${id}/`, { method: 'DELETE' }); 
  },
  deleteWithUser: (id, userId) => apiCall(`reservations/${id}/?user_id=${userId}`, { method: 'DELETE' })
};

// Routes API
export const routes = {
  list: () => apiCall('routes/'),
  create: (data) => apiCall('routes/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  get: (id) => apiCall(`routes/${id}/`),
  update: (id, data) => apiCall(`routes/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`routes/${id}/`, { method: 'DELETE' }),
};

// Reports API
export const reports = {
  list: () => apiCall('reports/'),
  create: (data) => apiCall('reports/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`reports/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};

// Users API (Staff only)
export const users = {
  list: () => apiCall('auth/users/'),
  get: (id) => apiCall(`auth/users/${id}/`),
  update: (id, data) => apiCall(`auth/users/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`auth/users/${id}/`, { method: 'DELETE' }),
};

// Check if user is authenticated. Note: right after a page load, this is
// false until auth.restoreSession() (called once on app boot) has had a
// chance to run — the access token is memory-only and doesn't survive a
// reload by itself.
export const isAuthenticated = () => {
  return !!getAccessToken();
};

// Get user role from stored data
export const getUserRole = async () => {
  try {
    const user = await auth.getProfile();
    return user.role;
  } catch {
    return null;
  }
};
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('fleetmark_user') || 'null');
  } catch {
    return null;
  }
}
