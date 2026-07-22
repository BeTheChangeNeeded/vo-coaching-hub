const { sendEmail, brandWrap } = require('../_shared/email');
const ws = require('../_shared/wsstore');

// Coachee requests a new assessment, a debrief, or a coaching session. We notify
// the coach (and an admin fallback) by email. Best-effort: if email isn't
// configured, the request is still acknowledged (the client tracks its status).
const LABEL = { assessment: 'a new TriMetrix HD assessment', debrief: 'a TriMetrix debrief session', session: 'a coaching session' };

module.exports = async function (context, req) {
  try {
    const b = req.body || {};
    const type = b.type || 'session';
    const p = ws.principal(req);
    const fromEmail = (p && ws.emailOf(p)) || (b.profile && b.profile.email) || 'a coachee';
    const name = (b.profile && b.profile.name) || fromEmail;
    const to = b.coachEmail || process.env.COACH_REQUESTS_TO || process.env.ADMIN_EMAIL || '';

    let emailed = false;
    if (to) {
      const html = brandWrap(`
        <h2 style="font-family:Georgia,serif">New coaching request</h2>
        <p><b>${escapeHtml(name)}</b> (${escapeHtml(fromEmail)}) has requested <b>${escapeHtml(LABEL[type] || type)}</b>.</p>
        ${b.note ? `<p style="color:#475569">Note: ${escapeHtml(b.note)}</p>` : ''}
        <p style="color:#64748b;font-size:13px">Reply to this person to schedule. Sent from the VisionOne Coaching Hub.</p>`, 'VisionOne Coaching Hub');
      const r = await sendEmail({ to, subject: `Coaching request: ${LABEL[type] || type}`, html, context });
      emailed = !!r.sent;
    }
    context.res = { status: 200, body: { ok: true, emailed } };
  } catch (err) {
    context.log.error('requests failed', err);
    // Never block the coachee — acknowledge even on failure.
    context.res = { status: 200, body: { ok: true, emailed: false, warning: err.message } };
  }
};

function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
