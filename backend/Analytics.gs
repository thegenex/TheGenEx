/**
 * Analytics.gs — visitor/session upsert, page view tracking, event tracking.
 */

function upsertVisitor_(visitorId, meta) {
  if (!visitorId) return;
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const { sheet, rows } = readAllRows_(SHEET_VISITORS);
    const now = new Date().toISOString();
    const ua = parseUserAgent_(meta.userAgent);
    const existing = rows.find(function (r) { return r.visitor_id === visitorId; });

    if (existing) {
      const headers = COLUMNS[SHEET_VISITORS];
      const rowIdx = existing.__row;
      sheet.getRange(rowIdx, headers.indexOf('last_visit') + 1).setValue(now);
      sheet.getRange(rowIdx, headers.indexOf('visit_count') + 1).setValue(Number(existing.visit_count || 0) + (meta.isNewSession ? 1 : 0));
      sheet.getRange(rowIdx, headers.indexOf('page_count') + 1).setValue(Number(existing.page_count || 0) + 1);
    } else {
      appendRowObject_(SHEET_VISITORS, {
        visitor_id: visitorId,
        first_visit: now,
        last_visit: now,
        visit_count: 1,
        page_count: 1,
        referrer: clip_(meta.referrer, LIMITS.referrer),
        device: ua.device,
        browser: ua.browser,
        os: ua.os,
        country: '',
      });
    }
  } finally {
    lock.releaseLock();
  }
}

function trackPageView_(input, meta) {
  input = input || {};
  meta = meta || {};
  if (!input.page) return fail_('VALIDATION_ERROR', 'page is required.');

  const ua = parseUserAgent_(meta.userAgent);
  const row = {
    id: generateId_('pv'),
    timestamp: new Date().toISOString(),
    visitor_id: clip_(input.visitor_id, 100),
    session_id: clip_(input.session_id, 100),
    page: clip_(input.page, LIMITS.page),
    referrer: clip_(input.referrer, LIMITS.referrer),
    device: ua.device,
    browser: ua.browser,
    os: ua.os,
  };
  appendRowObject_(SHEET_PAGEVIEWS, row);
  upsertVisitor_(row.visitor_id, { userAgent: meta.userAgent, referrer: input.referrer, isNewSession: !!input.is_new_session });

  return ok_({}, 'Tracked.');
}

function trackEvent_(input, meta) {
  input = input || {};
  meta = meta || {};
  if (!input.event_name) return fail_('VALIDATION_ERROR', 'event_name is required.');

  let metadataStr = '';
  if (input.metadata) {
    try {
      metadataStr = typeof input.metadata === 'string' ? input.metadata : JSON.stringify(input.metadata);
    } catch (e) {
      metadataStr = '';
    }
    metadataStr = clip_(metadataStr, LIMITS.metadata);
  }

  const row = {
    id: generateId_('ev'),
    timestamp: new Date().toISOString(),
    visitor_id: clip_(input.visitor_id, 100),
    session_id: clip_(input.session_id, 100),
    event_name: clip_(input.event_name, LIMITS.event_name),
    page: clip_(input.page, LIMITS.page),
    metadata: metadataStr,
  };
  appendRowObject_(SHEET_EVENTS, row);
  return ok_({}, 'Tracked.');
}
