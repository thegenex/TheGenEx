/**
 * Config.gs — central configuration for the theGenEx Apps Script backend.
 *
 * Nothing secret lives in source. Secrets/config live in Script Properties
 * (Project Settings → Script Properties in the Apps Script editor), read at
 * runtime via PropertiesService. This file only defines constants, sheet
 * names/columns, and small helpers for reading configuration with sane
 * fallbacks.
 */

// ---- Sheet tab names -------------------------------------------------
const SHEET_LEADS = 'Leads';
const SHEET_VISITORS = 'Visitors';
const SHEET_PAGEVIEWS = 'PageViews';
const SHEET_EVENTS = 'Events';
const SHEET_ADMINS = 'Admins';
const SHEET_SETTINGS = 'Settings';
const SHEET_SESSIONS = 'Sessions'; // internal, not in the spec's list but needed for auth
const SHEET_OTP = 'Otp'; // internal, short-lived one-time codes

// ---- Column layouts (order matters; used for header creation + row building) ----
const COLUMNS = {
  [SHEET_LEADS]: [
    'id', 'created_at', 'name', 'company', 'email', 'phone', 'requirement',
    'budget', 'message', 'source_page', 'status', 'user_agent', 'ip_hash',
    'visitor_id',
  ],
  [SHEET_VISITORS]: [
    'visitor_id', 'first_visit', 'last_visit', 'visit_count', 'page_count',
    'referrer', 'device', 'browser', 'os', 'country',
  ],
  [SHEET_PAGEVIEWS]: [
    'id', 'timestamp', 'visitor_id', 'session_id', 'page', 'referrer',
    'device', 'browser', 'os',
  ],
  [SHEET_EVENTS]: [
    'id', 'timestamp', 'visitor_id', 'session_id', 'event_name', 'page', 'metadata',
  ],
  [SHEET_ADMINS]: [
    'email', 'role', 'added_at', 'active',
  ],
  [SHEET_SETTINGS]: [
    'key', 'value',
  ],
  [SHEET_SESSIONS]: [
    'token_hash', 'email', 'created_at', 'expires_at',
  ],
  [SHEET_OTP]: [
    'email', 'code_hash', 'created_at', 'expires_at', 'attempts',
  ],
};

const LEAD_STATUSES = ['New', 'Contacted', 'In Progress', 'Converted', 'Closed'];

// ---- Limits (server-side enforced) -----------------------------------
const LIMITS = {
  name: 100,
  company: 150,
  email: 254,
  phone: 30,
  requirement: 200,
  budget: 60,
  message: 5000,
  source_page: 200,
  user_agent: 300,
  page: 300,
  referrer: 300,
  event_name: 80,
  metadata: 1000,
};

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;

/**
 * Reads a config value from Script Properties, falling back to a default.
 * Use this instead of hardcoding config values throughout the code.
 */
function getConfig_(key, fallback) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  return (value === null || value === undefined || value === '') ? fallback : value;
}

/** Returns the target spreadsheet, opened by ID from Script Properties. */
function getSpreadsheet_() {
  const id = getConfig_('SPREADSHEET_ID', '');
  if (!id) {
    throw new Error('SPREADSHEET_ID is not configured in Script Properties.');
  }
  return SpreadsheetApp.openById(id);
}

/**
 * Notification email recipient for new leads. Configured via the Settings
 * sheet ("notification_email") or the NOTIFICATION_EMAIL Script Property —
 * see README for setup. No hardcoded fallback: if unset, notification email
 * sending is skipped (the lead is still saved) rather than silently going
 * to the wrong inbox.
 */
function getNotificationEmail_() {
  return getSettingOrProperty_('notification_email', 'NOTIFICATION_EMAIL', '');
}

function getCompanyName_() {
  return getSettingOrProperty_('company_name', null, 'theGenEx');
}

/**
 * Settings sheet takes priority over Script Properties for values that are
 * meant to be editable without redeploying (e.g. notification_email).
 */
function getSettingOrProperty_(settingsKey, propKey, fallback) {
  try {
    const fromSheet = getSettingValue_(settingsKey);
    if (fromSheet) return fromSheet;
  } catch (err) {
    // Settings sheet may not exist yet on first run; fall through.
  }
  if (propKey) {
    const fromProps = PropertiesService.getScriptProperties().getProperty(propKey);
    if (fromProps) return fromProps;
  }
  return fallback;
}

/** Returns the APP_SECRET used for HMAC-signing session tokens. */
function getAppSecret_() {
  const secret = PropertiesService.getScriptProperties().getProperty('APP_SECRET');
  if (!secret) {
    throw new Error('APP_SECRET is not configured in Script Properties.');
  }
  return secret;
}
