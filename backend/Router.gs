/**
 * Router.gs — doGet/doPost entry points and action dispatch.
 *
 * All requests use an `action` parameter. GET is used for reads that are
 * safe to call from a simple browser request (no custom headers needed,
 * which sidesteps Apps Script's CORS preflight limitations); POST is used
 * for writes. Request bodies for POST are JSON in e.postData.contents.
 *
 * Admin-only actions require a `token` (GET query param or POST body field)
 * verified via requireAdmin_(). Unauthorized requests are rejected server-side
 * regardless of what the frontend does.
 */

const ADMIN_ACTIONS = {
  dashboard: true,
  dashboardAnalytics: true,
  leads: true,
  lead: true,
  updateLeadStatus: true,
};

function doGet(e) {
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  try {
    const params = (e && e.parameter) || {};
    let body = {};
    if (method === 'POST' && e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (err) {
        return fail_('VALIDATION_ERROR', 'Request body must be valid JSON.');
      }
    }

    const action = params.action || body.action;
    if (!action) {
      return fail_('VALIDATION_ERROR', 'Missing "action" parameter.');
    }

    // Note: Apps Script web apps do not expose the caller's real IP address
    // to server code, so ip_hash is left blank unless the client explicitly
    // supplies a value it obtained itself (not required, and not trusted for
    // anything security-sensitive — it is informational only).
    const meta = {
      userAgent: params.ua || body.user_agent || '',
      referrer: params.referrer || body.referrer || '',
      ipHash: hashIp_(body.client_ip_hint || ''),
    };

    if (ADMIN_ACTIONS[action]) {
      const token = params.token || body.token;
      const adminEmail = requireAdmin_(token);
      if (!adminEmail) {
        return fail_('UNAUTHORIZED', 'Authentication required.');
      }
      return dispatchAdmin_(action, params, body, adminEmail);
    }

    return dispatchPublic_(action, params, body, meta);
  } catch (err) {
    return failFromError_(err, 'INTERNAL_ERROR');
  }
}

function dispatchPublic_(action, params, body, meta) {
  switch (action) {
    case 'health':
      return ok_({ status: 'healthy' }, 'OK');

    case 'submitLead':
      return submitLead_(body, meta);

    case 'trackPageView':
      return trackPageView_(body, meta);

    case 'trackEvent':
      return trackEvent_(body, meta);

    case 'requestAdminOtp':
      return requestAdminOtp_(body.email);

    case 'verifyAdminOtp':
      return verifyAdminOtp_(body.email, body.code);

    default:
      return fail_('INVALID_ACTION', 'Unknown action.');
  }
}

function dispatchAdmin_(action, params, body, adminEmail) {
  switch (action) {
    case 'dashboard':
      return getDashboardOverview_();

    case 'dashboardAnalytics':
      return getDashboardAnalytics_(params.range || body.range);

    case 'leads':
      return listLeads_(params);

    case 'lead':
      return getLead_(params.id);

    case 'updateLeadStatus':
      return updateLeadStatus_(body.id || params.id, body.status || params.status);

    default:
      return fail_('INVALID_ACTION', 'Unknown action.');
  }
}
