/**
 * api.ts — single client for the theGenEx Google Apps Script backend.
 *
 * All backend communication goes through this file. The backend URL comes
 * from VITE_API_URL; when it is not configured, calls fall back to a mock
 * mode so the site (including the contact form and admin preview) keeps
 * working in local development without a deployed backend.
 *
 * Apps Script web apps do not support custom CORS headers on preflighted
 * requests, so:
 *  - GET requests are used for reads (query-string params only).
 *  - POST requests send a JSON body with a "text/plain" content type,
 *    which Apps Script parses from e.postData.contents without triggering
 *    a CORS preflight.
 */

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '';
export const IS_MOCK_MODE = !API_URL;

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; fields?: Record<string, string> };
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

async function apiGet<T>(action: string, params: Record<string, string | undefined> = {}): Promise<ApiResult<T>> {
  if (IS_MOCK_MODE) return mockRequest<T>(action, params);
  try {
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') url.searchParams.set(k, v); });
    const res = await fetch(url.toString(), { method: 'GET' });
    return (await res.json()) as ApiResult<T>;
  } catch {
    return { success: false, error: { code: 'NETWORK_ERROR', message: 'Something went wrong. Please try again or email us directly at infothegenex@gmail.com.' } };
  }
}

async function apiPost<T>(action: string, body: Record<string, unknown> = {}): Promise<ApiResult<T>> {
  if (IS_MOCK_MODE) return mockRequest<T>(action, body);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...body }),
    });
    return (await res.json()) as ApiResult<T>;
  } catch {
    return { success: false, error: { code: 'NETWORK_ERROR', message: 'Something went wrong. Please try again or email us directly at infothegenex@gmail.com.' } };
  }
}

// ---- Mock mode (no backend configured) ------------------------------------

async function mockRequest<T>(action: string, _payload: Record<string, unknown>): Promise<ApiResult<T>> {
  await new Promise((r) => setTimeout(r, 300));
  console.info(`[api mock mode] ${action}`, _payload);
  switch (action) {
    case 'submitLead':
      return { success: true, data: { id: `mock_${Date.now()}` } as T, message: 'Success' };
    case 'trackPageView':
    case 'trackEvent':
      return { success: true, data: {} as T };
    case 'health':
      return { success: true, data: { status: 'mock' } as T };
    default:
      return { success: false, error: { code: 'MOCK_MODE', message: 'Backend is not configured (VITE_API_URL is unset).' } };
  }
}

// ---- Public API -------------------------------------------------------------

export interface LeadInput {
  name: string;
  email: string;
  requirement: string;
  company?: string;
  phone?: string;
  budget?: string;
  message?: string;
  source_page?: string;
  visitor_id?: string;
  session_id?: string;
  website?: string; // honeypot
}

export function submitLead(input: LeadInput) {
  return apiPost<{ id: string }>('submitLead', { ...input });
}

export function trackPageView(input: { page: string; referrer?: string; visitor_id?: string; session_id?: string; is_new_session?: boolean }) {
  return apiPost<Record<string, never>>('trackPageView', {
    ...input,
    user_agent: navigator.userAgent,
  });
}

export function trackEvent(input: { event_name: string; page?: string; metadata?: Record<string, string>; visitor_id?: string; session_id?: string }) {
  return apiPost<Record<string, never>>('trackEvent', {
    ...input,
    user_agent: navigator.userAgent,
  });
}

export function requestAdminOtp(email: string) {
  return apiPost<Record<string, never>>('requestAdminOtp', { email });
}

export function verifyAdminOtp(email: string, code: string) {
  return apiPost<{ token: string; email: string; expiresInMs: number }>('verifyAdminOtp', { email, code });
}

export interface DashboardOverview {
  totalVisitors: number;
  todayVisitors: number;
  totalPageViews: number;
  todayPageViews: number;
  totalLeads: number;
  todayLeads: number;
  convertedLeads: number;
  conversionRate: number;
  leadConversionRate: number;
}

export function getDashboardOverview(token: string) {
  return apiGet<DashboardOverview>('dashboard', { token });
}

export interface DashboardAnalytics {
  range: string;
  dailyVisitors: Array<{ date: string; count: number }>;
  dailyPageViews: Array<{ date: string; count: number }>;
  dailyLeads: Array<{ date: string; count: number }>;
  popularPages: Array<{ page: string; count: number }>;
  conversion: number;
}

export function getDashboardAnalytics(token: string, range: 'today' | '7d' | '30d' | 'all') {
  return apiGet<DashboardAnalytics>('dashboardAnalytics', { token, range });
}

export interface Lead {
  id: string;
  created_at: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  requirement: string;
  budget: string;
  message: string;
  source_page: string;
  status: string;
}

export function listLeads(token: string, params: { status?: string; q?: string } = {}) {
  return apiGet<{ leads: Lead[]; total: number }>('leads', { token, ...params });
}

export function updateLeadStatus(token: string, id: string, status: string) {
  return apiPost<{ id: string; status: string }>('updateLeadStatus', { token, id, status });
}
