/**
 * Code.gs — one-time setup helpers. Run `setupBackend_` once from the Apps
 * Script editor (select the function in the toolbar dropdown and click Run)
 * after configuring Script Properties (SPREADSHEET_ID, APP_SECRET,
 * NOTIFICATION_EMAIL, SEED_ADMIN_EMAIL — see Project Settings > Script
 * Properties). It creates all sheets with headers, seeds the Settings
 * sheet, and seeds the initial admin.
 *
 * This file intentionally contains no request-handling logic — see Router.gs.
 */

function setupBackend_() {
  const names = [
    SHEET_LEADS, SHEET_VISITORS, SHEET_PAGEVIEWS, SHEET_EVENTS,
    SHEET_ADMINS, SHEET_SETTINGS, SHEET_SESSIONS, SHEET_OTP,
  ];
  names.forEach(function (n) { getSheet_(n); });

  seedSettingIfMissing_('notification_email', getConfig_('NOTIFICATION_EMAIL', ''));
  seedSettingIfMissing_('company_name', 'theGenEx');
  seedSettingIfMissing_('send_confirmation_email', 'true');

  ensureSeedAdmin_();

  Logger.log('Setup complete. Sheets: ' + names.join(', '));
}

function seedSettingIfMissing_(key, value) {
  const { rows } = readAllRows_(SHEET_SETTINGS);
  const exists = rows.some(function (r) { return String(r.key) === key; });
  if (!exists) {
    appendRowObject_(SHEET_SETTINGS, { key: key, value: value });
  }
}

/**
 * Optional maintenance: deletes expired sessions and OTP rows older than 7
 * days to keep those sheets small. Safe to run manually or wire to a
 * time-driven trigger (Triggers → Add Trigger → time-driven, e.g. daily).
 */
function cleanupExpiredAuthRows_() {
  [SHEET_SESSIONS, SHEET_OTP].forEach(function (name) {
    const { sheet, rows } = readAllRows_(name);
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const rowsToDelete = rows
      .filter(function (r) { return new Date(r.expires_at || r.created_at).getTime() < cutoff; })
      .map(function (r) { return r.__row; })
      .sort(function (a, b) { return b - a; }); // delete bottom-up
    rowsToDelete.forEach(function (rowNum) { sheet.deleteRow(rowNum); });
  });
}
