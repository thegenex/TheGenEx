/**
 * Leads.gs — contact form submission, lead listing, and status updates.
 */

function validateLeadInput_(input) {
  const errors = {};
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim();
  const requirement = String(input.requirement || '').trim();
  const message = String(input.message || '').trim();

  if (!name) errors.name = 'Name is required.';
  else if (name.length > LIMITS.name) errors.name = 'Name is too long.';

  if (!email) errors.email = 'Email is required.';
  else if (!isValidEmail_(email)) errors.email = 'Enter a valid email address.';

  if (!requirement) errors.requirement = 'Tell us what you want to build.';
  else if (requirement.length > LIMITS.requirement) errors.requirement = 'Requirement is too long.';

  if (input.company && String(input.company).length > LIMITS.company) errors.company = 'Company name is too long.';
  if (input.phone && String(input.phone).length > LIMITS.phone) errors.phone = 'Phone number is too long.';
  if (input.budget && String(input.budget).length > LIMITS.budget) errors.budget = 'Budget is too long.';
  if (message && message.length > LIMITS.message) errors.message = 'Message is too long.';

  return errors;
}

function submitLead_(input, meta) {
  input = input || {};
  meta = meta || {};

  // Honeypot: a hidden field real users never fill. If populated, silently
  // report success without writing anything (do not tip off bots).
  if (input.website || input.hp || input._gotcha) {
    return ok_({ id: generateId_('lead') }, 'Success');
  }

  const errors = validateLeadInput_(input);
  if (Object.keys(errors).length > 0) {
    return jsonOutput_({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please check the highlighted fields.', fields: errors } });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // Duplicate submission protection: same email + requirement within 2 minutes.
    const dupWindowMs = 2 * 60 * 1000;
    const email = String(input.email).trim().toLowerCase();
    const { rows } = readAllRows_(SHEET_LEADS);
    const now = Date.now();
    const isDuplicate = rows.some(function (r) {
      const sameEmail = String(r.email).trim().toLowerCase() === email;
      const created = new Date(r.created_at).getTime();
      return sameEmail && (now - created) < dupWindowMs;
    });
    if (isDuplicate) {
      return ok_({ id: generateId_('lead') }, 'Success');
    }

    const id = generateId_('lead');
    const createdAt = new Date().toISOString();
    const lead = {
      id: id,
      created_at: createdAt,
      name: clip_(input.name, LIMITS.name),
      company: clip_(input.company, LIMITS.company),
      email: clip_(email, LIMITS.email),
      phone: clip_(input.phone, LIMITS.phone),
      requirement: clip_(input.requirement, LIMITS.requirement),
      budget: clip_(input.budget, LIMITS.budget),
      message: clip_(input.message, LIMITS.message),
      source_page: clip_(input.source_page, LIMITS.source_page),
      status: 'New',
      user_agent: clip_(meta.userAgent, LIMITS.user_agent),
      ip_hash: meta.ipHash || '',
      visitor_id: clip_(input.visitor_id, 100),
    };

    appendRowObject_(SHEET_LEADS, lead);

    try { trackEvent_({ visitor_id: input.visitor_id, session_id: input.session_id, event_name: 'contact_form_submit', page: input.source_page }, meta); } catch (e) {}

    // Email is best-effort; the lead is already saved regardless of outcome.
    sendLeadNotificationEmail_(lead);
    sendLeadConfirmationEmail_(lead);

    return ok_({ id: id }, 'Success');
  } finally {
    lock.releaseLock();
  }
}

function listLeads_(params) {
  params = params || {};
  const { rows } = readAllRows_(SHEET_LEADS);
  let result = rows.map(function (r) {
    return {
      id: r.id,
      created_at: r.created_at,
      name: r.name,
      company: r.company,
      email: r.email,
      phone: r.phone,
      requirement: r.requirement,
      budget: r.budget,
      message: r.message,
      source_page: r.source_page,
      status: r.status,
    };
  });

  if (params.status) {
    result = result.filter(function (l) { return l.status === params.status; });
  }
  if (params.q) {
    const q = String(params.q).toLowerCase();
    result = result.filter(function (l) {
      return (l.name || '').toLowerCase().indexOf(q) !== -1 ||
        (l.email || '').toLowerCase().indexOf(q) !== -1 ||
        (l.company || '').toLowerCase().indexOf(q) !== -1 ||
        (l.requirement || '').toLowerCase().indexOf(q) !== -1;
    });
  }

  result.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });

  return ok_({ leads: result, total: result.length });
}

function getLead_(id) {
  const { rows } = readAllRows_(SHEET_LEADS);
  const lead = rows.find(function (r) { return r.id === id; });
  if (!lead) return fail_('NOT_FOUND', 'Lead not found.');
  return ok_({ lead: lead });
}

function updateLeadStatus_(id, status) {
  if (!id || !status) return fail_('VALIDATION_ERROR', 'id and status are required.');
  if (LEAD_STATUSES.indexOf(status) === -1) {
    return fail_('VALIDATION_ERROR', 'Invalid status value.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const { sheet, rows } = readAllRows_(SHEET_LEADS);
    const match = rows.find(function (r) { return r.id === id; });
    if (!match) return fail_('NOT_FOUND', 'Lead not found.');
    const statusCol = COLUMNS[SHEET_LEADS].indexOf('status') + 1;
    sheet.getRange(match.__row, statusCol).setValue(status);
    return ok_({ id: id, status: status }, 'Status updated.');
  } finally {
    lock.releaseLock();
  }
}
