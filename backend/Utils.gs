/**
 * Utils.gs — shared helpers: responses, validation, sanitization, IDs, sheet I/O.
 */

// ---- JSON responses ----------------------------------------------------

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(data, message) {
  return jsonOutput_({ success: true, data: data || {}, message: message || 'Success' });
}

function fail_(code, message, httpNote) {
  return jsonOutput_({ success: false, error: { code: code, message: message } });
}

/** Logs full error detail server-side; returns a safe, generic error to the client. */
function failFromError_(err, code) {
  console.error((code || 'ERROR') + ': ' + (err && err.stack ? err.stack : err));
  return fail_(code || 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
}

// ---- IDs ----------------------------------------------------------------

function generateId_(prefix) {
  const rand = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  return (prefix ? prefix + '_' : '') + Date.now().toString(36) + rand;
}

// ---- Validation / sanitization ------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Prevents spreadsheet formula injection. If a string begins with a
 * formula-triggering character, prefix it with a single quote-equivalent
 * (leading apostrophe forces text interpretation in Sheets) — here we
 * prepend a space-safe neutral marker by prefixing with an apostrophe
 * character embedded in the string itself, which Sheets strips only when
 * set via setValue with a leading apostrophe on *input strings*; since we
 * write via setValues() (not user typing), Sheets stores the literal string
 * as-is and never evaluates it as a formula UNLESS the cell is later
 * re-entered by a human. As defense in depth we still neutralize leading
 * =, +, -, @ (and tab/CR which some clients use to bypass filters).
 */
function sanitizeCell_(value) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  s = s.replace(/[\r\n\t]+/g, ' ').trim();
  if (/^[=+\-@]/.test(s)) {
    s = "'" + s;
  }
  return s;
}

function clip_(value, maxLen) {
  const s = (value === null || value === undefined) ? '' : String(value);
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function isValidEmail_(email) {
  return typeof email === 'string' && email.length <= LIMITS.email && EMAIL_RE.test(email);
}

/** Basic HTML-escaping for values interpolated into notification emails. */
function escapeHtml_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---- Hashing --------------------------------------------------------------

function sha256Hex_(input) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function hmacHex_(secret, input) {
  const bytes = Utilities.computeHmacSha256Signature(input, secret, Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

/** Hash an IP address (or any identifier) with the app secret as pepper. */
function hashIp_(ip) {
  if (!ip) return '';
  try {
    return sha256Hex_(ip + '|' + getAppSecret_());
  } catch (e) {
    return sha256Hex_(ip);
  }
}

// ---- Sheet I/O helpers ------------------------------------------------

/** Gets (creating if needed) a sheet with the correct header row. */
function getSheet_(name) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(name);
  const headers = COLUMNS[name];
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    return sheet;
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Appends a row built from a {column: value} object, in header order, sanitized. */
function appendRowObject_(sheetName, rowObj) {
  const sheet = getSheet_(sheetName);
  const headers = COLUMNS[sheetName];
  const row = headers.map(function (col) {
    return sanitizeCell_(rowObj[col] !== undefined ? rowObj[col] : '');
  });
  sheet.appendRow(row);
  return row;
}

/** Reads all data rows (excluding header) as an array of {column: value} objects. */
function readAllRows_(sheetName) {
  const sheet = getSheet_(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return { sheet: sheet, headers: COLUMNS[sheetName], rows: [] };
  const headers = COLUMNS[sheetName];
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const rows = values.map(function (r, i) {
    const obj = {};
    headers.forEach(function (h, idx) { obj[h] = r[idx]; });
    obj.__row = i + 2; // 1-indexed sheet row number
    return obj;
  });
  return { sheet: sheet, headers: headers, rows: rows };
}

function getSettingValue_(key) {
  const { rows } = readAllRows_(SHEET_SETTINGS);
  const match = rows.find(function (r) { return String(r.key) === key; });
  return match ? String(match.value) : '';
}

function isToday_(dateVal) {
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function daysAgo_(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Parses simple UA info from a user-agent string: device/browser/os. */
function parseUserAgent_(ua) {
  ua = ua || '';
  const device = /Mobi|Android/i.test(ua) ? 'mobile' : (/Tablet|iPad/i.test(ua) ? 'tablet' : 'desktop');
  let browser = 'other';
  if (/Edg\//i.test(ua)) browser = 'edge';
  else if (/Chrome\//i.test(ua)) browser = 'chrome';
  else if (/Firefox\//i.test(ua)) browser = 'firefox';
  else if (/Safari\//i.test(ua)) browser = 'safari';
  let os = 'other';
  if (/Windows/i.test(ua)) os = 'windows';
  else if (/Mac OS/i.test(ua)) os = 'macos';
  else if (/Android/i.test(ua)) os = 'android';
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'ios';
  else if (/Linux/i.test(ua)) os = 'linux';
  return { device: device, browser: browser, os: os };
}
