/**
 * Email.gs — outbound email for lead notifications and client confirmations.
 * Uses MailApp (no external SMTP). Failures are logged, never thrown, so a
 * mail outage never causes a lead to be lost or the API call to fail.
 */

function sendLeadNotificationEmail_(lead) {
  try {
    const to = getNotificationEmail_();
    const company = getCompanyName_();
    const subject = 'New ' + company + ' Project Enquiry — ' + lead.name;

    const rows = [
      ['Name', lead.name],
      ['Company', lead.company],
      ['Email', lead.email],
      ['Phone', lead.phone],
      ['Requirement', lead.requirement],
      ['Budget', lead.budget],
      ['Message', lead.message],
    ];

    const htmlRows = rows
      .filter(function (r) { return r[1]; })
      .map(function (r) {
        return '<tr><td style="padding:6px 12px;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">' +
          escapeHtml_(r[0]) + '</td><td style="padding:6px 12px;font-size:14px;color:#111827;">' +
          escapeHtml_(r[1]).replace(/\n/g, '<br>') + '</td></tr>';
      }).join('');

    const html = '' +
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;">' +
      '<div style="background:#0a1014;padding:20px 24px;border-radius:8px 8px 0 0;">' +
      '<span style="color:#3dd6c1;font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;">' + escapeHtml_(company) + '</span>' +
      '<h1 style="color:#ffffff;font-size:20px;margin:8px 0 0;">New Project Enquiry</h1>' +
      '</div>' +
      '<div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:8px 12px;">' +
      '<table style="width:100%;border-collapse:collapse;">' + htmlRows + '</table>' +
      '<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">' +
      '<table style="width:100%;border-collapse:collapse;">' +
      '<tr><td style="padding:4px 12px;color:#9ca3af;font-size:12px;">Source</td><td style="padding:4px 12px;color:#6b7280;font-size:12px;">' + escapeHtml_(lead.source_page) + '</td></tr>' +
      '<tr><td style="padding:4px 12px;color:#9ca3af;font-size:12px;">Submitted at</td><td style="padding:4px 12px;color:#6b7280;font-size:12px;">' + escapeHtml_(lead.created_at) + '</td></tr>' +
      '<tr><td style="padding:4px 12px;color:#9ca3af;font-size:12px;">Lead ID</td><td style="padding:4px 12px;color:#6b7280;font-size:12px;">' + escapeHtml_(lead.id) + '</td></tr>' +
      '</table>' +
      '</div></div>';

    const text = 'New Project Enquiry\n\n' +
      rows.map(function (r) { return r[0] + ': ' + (r[1] || '-'); }).join('\n') +
      '\n\nSource: ' + lead.source_page +
      '\nSubmitted At: ' + lead.created_at +
      '\nLead ID: ' + lead.id;

    MailApp.sendEmail({ to: to, subject: subject, body: text, htmlBody: html });
  } catch (e) {
    console.error('Failed to send lead notification email: ' + e);
  }
}

function sendLeadConfirmationEmail_(lead) {
  try {
    const confirmEnabled = String(getSettingOrProperty_('send_confirmation_email', null, 'true')).toLowerCase() !== 'false';
    if (!confirmEnabled || !lead.email) return;

    const company = getCompanyName_();
    const subject = 'Thanks for reaching out to ' + company;
    const text = 'Hi ' + (lead.name || 'there') + ',\n\n' +
      'Thanks for reaching out to ' + company + '.\n\n' +
      "We've received your project enquiry and will review it shortly.\n\n" +
      company + '\nAI Automation & Technology Agency';

    const html = '' +
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#111827;">' +
      '<p style="font-size:15px;">Hi ' + escapeHtml_(lead.name || 'there') + ',</p>' +
      '<p style="font-size:15px;line-height:1.6;">Thanks for reaching out to <strong>' + escapeHtml_(company) + '</strong>.</p>' +
      '<p style="font-size:15px;line-height:1.6;">We\'ve received your project enquiry and will review it shortly.</p>' +
      '<p style="margin-top:24px;font-size:13px;color:#6b7280;">' + escapeHtml_(company) + '<br>AI Automation &amp; Technology Agency</p>' +
      '</div>';

    MailApp.sendEmail({ to: lead.email, subject: subject, body: text, htmlBody: html });
  } catch (e) {
    console.error('Failed to send lead confirmation email: ' + e);
  }
}
