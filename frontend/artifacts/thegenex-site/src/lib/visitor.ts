/**
 * visitor.ts — privacy-conscious anonymous visitor/session identification.
 *
 * visitor_id: a random, non-identifying ID persisted in localStorage across visits.
 * session_id: a random ID persisted in sessionStorage — regenerates per browser session.
 *
 * No names, emails, or other PII are ever used as an identifier here.
 */

const VISITOR_KEY = 'thegenex_visitor_id';
const SESSION_KEY = 'thegenex_session_id';
const SESSION_SEEN_KEY = 'thegenex_session_seen';

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

/** Returns the session id, and whether this is the first call in the session. */
export function getSessionId(): { sessionId: string; isNewSession: boolean } {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    let isNew = false;
    if (!id) {
      id = randomId();
      sessionStorage.setItem(SESSION_KEY, id);
      isNew = !sessionStorage.getItem(SESSION_SEEN_KEY);
      sessionStorage.setItem(SESSION_SEEN_KEY, '1');
    }
    return { sessionId: id, isNewSession: isNew };
  } catch {
    return { sessionId: 'anon-session', isNewSession: false };
  }
}
