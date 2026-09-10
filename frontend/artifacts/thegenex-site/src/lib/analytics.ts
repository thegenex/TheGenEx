import { trackEvent as apiTrackEvent, trackPageView as apiTrackPageView } from '@/lib/api';
import { getSessionId, getVisitorId } from '@/lib/visitor';

/**
 * track() — original local-only analytics abstraction, kept for backward
 * compatibility with any existing call sites. It is a best-effort, purely
 * local debug trail and never blocks or throws.
 */
export const track = (event: string, metadata?: Record<string, string>) => {
  const payload = { event, metadata, at: new Date().toISOString() };
  try {
    const existing = JSON.parse(localStorage.getItem('thegenex_analytics') ?? '[]');
    localStorage.setItem('thegenex_analytics', JSON.stringify([...existing.slice(-49), payload]));
  } catch {
    // Analytics is intentionally best-effort and isolated from product behavior.
  }
};

/**
 * trackPageView() — call once per route change. Sends the page view to the
 * backend (Google Apps Script → PageViews sheet) and upserts the visitor
 * record. Best-effort: failures are swallowed so navigation is never blocked.
 */
export function trackPageView(page: string) {
  track('page_view', { page });
  try {
    const visitorId = getVisitorId();
    const { sessionId, isNewSession } = getSessionId();
    void apiTrackPageView({
      page,
      referrer: document.referrer || '',
      visitor_id: visitorId,
      session_id: sessionId,
      is_new_session: isNewSession,
    });
  } catch {
    // Never let analytics affect navigation.
  }
}

/**
 * trackEvent() — call for meaningful interactions (CTA clicks, form events,
 * product/service clicks, email clicks). Metadata should stay small and
 * non-sensitive — never pass form contents (name/email/message) here.
 */
export function trackEvent(eventName: string, metadata?: Record<string, string>, page?: string) {
  track(eventName, metadata);
  try {
    const visitorId = getVisitorId();
    const { sessionId } = getSessionId();
    void apiTrackEvent({
      event_name: eventName,
      page: page ?? window.location.pathname,
      metadata,
      visitor_id: visitorId,
      session_id: sessionId,
    });
  } catch {
    // Never let analytics affect the UI.
  }
}
