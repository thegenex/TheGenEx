/**
 * admin-auth.ts — client-side session storage for the admin dashboard.
 *
 * The token itself is opaque and meaningless without the server: it is
 * verified on every admin API call in Router.gs / Auth.gs (requireAdmin_).
 * Storing it in localStorage is fine because it grants no more than what the
 * backend is willing to authorize for that specific signed, short-lived token.
 */

const TOKEN_KEY = 'thegenex_admin_token';
const EMAIL_KEY = 'thegenex_admin_email';
const EXPIRES_KEY = 'thegenex_admin_expires';

export interface AdminSession {
  token: string;
  email: string;
  expiresAt: number;
}

export function saveAdminSession(token: string, email: string, expiresInMs: number) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EMAIL_KEY, email);
    localStorage.setItem(EXPIRES_KEY, String(Date.now() + expiresInMs));
  } catch {
    // If storage is unavailable, the session simply won't persist across reloads.
  }
}

export function getAdminSession(): AdminSession | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const email = localStorage.getItem(EMAIL_KEY);
    const expiresAt = Number(localStorage.getItem(EXPIRES_KEY) ?? 0);
    if (!token || !email || !expiresAt || Date.now() > expiresAt) return null;
    return { token, email, expiresAt };
  } catch {
    return null;
  }
}

export function clearAdminSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(EXPIRES_KEY);
  } catch {
    // no-op
  }
}
