/**
 * Auth.gs — admin authentication (email allowlist + one-time code + signed session tokens).
 *
 * Flow:
 *   1. Admin submits their email -> requestAdminOtp_
 *      - If email is in the Admins sheet and active, generate a 6-digit code,
 *        store its hash + expiry in the Otp sheet, email it via MailApp.
 *      - Always return a generic success (does not reveal whether the email is an admin).
 *   2. Admin submits email + code -> verifyAdminOtp_
 *      - Validate code, rate-limit attempts, issue a signed session token.
 *      - Token = "<random>.<expiresAt>.<hmac>" — HMAC covers email+random+expiresAt
 *        with APP_SECRET. Only a hash of the token is stored server-side (Sessions sheet),
 *        so a leaked sheet row cannot be replayed as a live token.
 *   3. Every admin API call -> requireAdmin_(token) verifies signature + expiry + session row.
 */

function normalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function isAllowlistedAdmin_(email) {
  const { rows } = readAllRows_(SHEET_ADMINS);
  const target = normalizeEmail_(email);
  return rows.some(function (r) {
    return normalizeEmail_(r.email) === target && String(r.active).toLowerCase() !== 'false' && r.active !== false;
  });
}

/** Ensures the seed admin from Script Properties exists in the Admins sheet. */
function ensureSeedAdmin_() {
  const seed = normalizeEmail_(getConfig_('SEED_ADMIN_EMAIL', ''));
  if (!seed) return;
  const { rows, sheet } = readAllRows_(SHEET_ADMINS);
  const exists = rows.some(function (r) { return normalizeEmail_(r.email) === seed; });
  if (!exists) {
    appendRowObject_(SHEET_ADMINS, { email: seed, role: 'owner', added_at: new Date().toISOString(), active: true });
  }
}

function generateOtpCode_() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

function requestAdminOtp_(email) {
  const normalized = normalizeEmail_(email);
  if (!isValidEmail_(normalized)) {
    return fail_('VALIDATION_ERROR', 'A valid email is required.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    ensureSeedAdmin_();
    if (isAllowlistedAdmin_(normalized)) {
      const code = generateOtpCode_();
      const now = Date.now();
      appendRowObject_(SHEET_OTP, {
        email: normalized,
        code_hash: sha256Hex_(code + '|' + getAppSecret_()),
        created_at: new Date(now).toISOString(),
        expires_at: new Date(now + OTP_TTL_MS).toISOString(),
        attempts: 0,
      });
      sendOtpEmail_(normalized, code);
    }
    // Always the same response, whether or not the email is an admin —
    // avoids leaking which addresses are valid admins.
    return ok_({}, 'If that email is registered, a sign-in code has been sent.');
  } finally {
    lock.releaseLock();
  }
}

function verifyAdminOtp_(email, code) {
  const normalized = normalizeEmail_(email);
  const submitted = String(code || '').trim();
  if (!isValidEmail_(normalized) || !/^\d{6}$/.test(submitted)) {
    return fail_('VALIDATION_ERROR', 'A valid email and 6-digit code are required.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const { sheet, rows } = readAllRows_(SHEET_OTP);
    // Most recent OTP for this email.
    const candidates = rows
      .map(function (r, i) { return { r: r, idx: i }; })
      .filter(function (x) { return normalizeEmail_(x.r.email) === normalized; });

    if (candidates.length === 0) {
      return fail_('INVALID_CODE', 'Invalid or expired code.');
    }
    const latest = candidates[candidates.length - 1].r;

    if (new Date(latest.expires_at).getTime() < Date.now()) {
      return fail_('INVALID_CODE', 'Invalid or expired code.');
    }
    if (Number(latest.attempts) >= OTP_MAX_ATTEMPTS) {
      return fail_('TOO_MANY_ATTEMPTS', 'Too many attempts. Request a new code.');
    }

    const expectedHash = sha256Hex_(submitted + '|' + getAppSecret_());
    if (expectedHash !== latest.code_hash) {
      sheet.getRange(latest.__row, COLUMNS[SHEET_OTP].indexOf('attempts') + 1)
        .setValue(Number(latest.attempts) + 1);
      return fail_('INVALID_CODE', 'Invalid or expired code.');
    }

    if (!isAllowlistedAdmin_(normalized)) {
      return fail_('UNAUTHORIZED', 'This account is not authorized.');
    }

    // Consume the OTP so it cannot be reused.
    sheet.getRange(latest.__row, COLUMNS[SHEET_OTP].indexOf('expires_at') + 1)
      .setValue(new Date(0).toISOString());

    const token = issueSessionToken_(normalized);
    return ok_({ token: token, email: normalized, expiresInMs: SESSION_TTL_MS }, 'Signed in.');
  } finally {
    lock.releaseLock();
  }
}

function issueSessionToken_(email) {
  const random = Utilities.getUuid();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = email + '.' + random + '.' + expiresAt;
  const sig = hmacHex_(getAppSecret_(), payload);
  const token = Utilities.base64EncodeWebSafe(email) + '.' + random + '.' + expiresAt + '.' + sig;

  appendRowObject_(SHEET_SESSIONS, {
    token_hash: sha256Hex_(token),
    email: email,
    created_at: new Date().toISOString(),
    expires_at: new Date(expiresAt).toISOString(),
  });
  return token;
}

/**
 * Verifies a session token: signature valid, not expired, and its hash still
 * present in the Sessions sheet (so revocation/rotation is possible).
 * Returns the admin email on success, or null on failure. Never throws.
 */
function requireAdmin_(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 4) return null;
    const [emailB64, random, expiresAtStr, sig] = parts;
    const email = Utilities.newBlob(Utilities.base64DecodeWebSafe(emailB64)).getDataAsString();
    const expiresAt = Number(expiresAtStr);
    if (!email || !expiresAt || isNaN(expiresAt)) return null;
    if (Date.now() > expiresAt) return null;

    const payload = email + '.' + random + '.' + expiresAt;
    const expectedSig = hmacHex_(getAppSecret_(), payload);
    if (expectedSig !== sig) return null;

    const { rows } = readAllRows_(SHEET_SESSIONS);
    const tokenHash = sha256Hex_(token);
    const match = rows.find(function (r) { return r.token_hash === tokenHash; });
    if (!match) return null;
    if (new Date(match.expires_at).getTime() < Date.now()) return null;

    if (!isAllowlistedAdmin_(email)) return null;

    return email;
  } catch (e) {
    console.error('requireAdmin_ error: ' + e);
    return null;
  }
}

function sendOtpEmail_(email, code) {
  const company = getCompanyName_();
  const subject = company + ' admin sign-in code';
  const body = 'Your sign-in code is: ' + code + '\n\nThis code expires in 10 minutes. ' +
    'If you did not request this, you can ignore this email.';
  try {
    MailApp.sendEmail({ to: email, subject: subject, body: body });
  } catch (e) {
    console.error('Failed to send OTP email: ' + e);
  }
}
