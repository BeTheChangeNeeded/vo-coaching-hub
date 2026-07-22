// Transactional email templates for key career-workspace events.
// Triggered by the frontend (or other functions) via the /api/notify endpoint.
const { sendEmail, brandWrap } = require('./email');

const TEMPLATES = {
  welcome: (d) => ({
    subject: `Welcome to ${d.tenantName}`,
    title: `Welcome${d.name ? `, ${d.name}` : ''}! 👋`,
    body: `<p>Your career workspace is ready. Here's where to start:</p>
      <ul style="line-height:1.7">
        <li><b>Resume Tailor</b> — match your resume to a specific job and get an ATS-readiness estimate.</li>
        <li><b>Mock Interview</b> — practice with role-specific questions and get coached feedback.</li>
        <li><b>AI Career Coach</b> — ask anything; it's grounded in your profile and goals.</li>
      </ul>
      <p>The more you fill in your profile, the smarter every tool gets.</p>`,
  }),
  'resume-ready': (d) => ({
    subject: `Your tailored resume is ready (ATS-readiness ${d.ats ?? '—'})`,
    title: 'Your tailored resume is ready 📄',
    body: `<p>We tailored your resume to <b>${esc(d.role || 'the target role')}</b>.</p>
      <p style="font-size:15px"><b>ATS-readiness estimate: ${d.ats ?? '—'}/100</b> — an estimate of alignment, not a guaranteed ATS score.</p>
      <p>Open the workspace to review the keyword match and improvement checklist.</p>`,
  }),
  'interview-complete': (d) => ({
    subject: 'Nice work — your mock interview is complete',
    title: 'Mock interview complete 🎙️',
    body: `<p>You finished a <b>${esc(d.type || 'mock')}</b> interview. Review your per-answer feedback and improved-answer examples in the workspace, then try a different interview type to keep sharpening.</p>`,
  }),
  'weekly-recap': (d) => {
    const s = d.stats || {};
    const goal = Number(d.goal) || 0;
    const applied = Number(s.applied) || 0;
    const pct = goal ? Math.min(100, Math.round((applied / goal) * 100)) : 0;
    const hit = goal && applied >= goal;
    return {
      subject: `Your weekly job-search recap${d.name ? `, ${d.name}` : ''}`,
      title: 'Your weekly recap 📈',
      body: `<p>Here's your progress over the last 7 days:</p>
        <ul style="line-height:1.9">
          <li><b>${applied}</b> application(s) submitted${goal ? ` — goal ${goal} (${pct}%)` : ''}</li>
          <li><b>${Number(s.interviews) || 0}</b> interview(s) in progress</li>
          <li><b>${Number(s.resumesTailored) || 0}</b> résumé(s) tailored</li>
          <li><b>${Number(s.mockInterviews) || 0}</b> mock interview(s) practiced</li>
        </ul>
        <p>${hit ? 'You hit your weekly goal — nice work! 🎉' : 'A little momentum each week adds up. Pick one role today and tailor your résumé to it.'}</p>
        ${d.appUrl ? `<p><a href="${esc(d.appUrl)}" style="display:inline-block;background:${d.primary || '#649954'};color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Open Career Hub →</a></p>` : ''}`,
    };
  },
  'coaching-request': (d) => ({
    subject: `Coaching request${d.name ? ` — ${d.name}` : ''}`,
    title: 'New coaching request 🧭',
    body: `<p>A user has requested coaching through ${d.tenantName}.</p>
      <ul style="line-height:1.7">
        <li><b>Name:</b> ${esc(d.name || '—')}</li>
        <li><b>Email:</b> ${esc(d.userEmail || '—')}</li>
        <li><b>Target role:</b> ${esc(d.role || '—')}</li>
        <li><b>Focus:</b> ${esc(d.focus || 'General career coaching')}</li>
      </ul>
      ${d.context ? `<p style="white-space:pre-wrap;color:#475569;font-size:13px">${esc(d.context)}</p>` : ''}
      <p>Reach out to schedule.</p>`,
  }),
};

function esc(s) { return String(s || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])); }

async function sendNotification({ type, to, data = {}, tenant = {}, attachments, context }) {
  const tpl = TEMPLATES[type];
  if (!tpl) throw Object.assign(new Error(`Unknown notification type: ${type}`), { statusCode: 400 });
  const tenantName = tenant.name || 'VisionOne Career Hub';
  const primary = (tenant.theme && tenant.theme.primary) || '#004b7c';
  const t = tpl({ ...data, tenantName });
  const html = brandWrap({ tenantName, primary, title: t.title, bodyHtml: t.body });
  return sendEmail({ to, subject: t.subject, html, attachments, context });
}

module.exports = { sendNotification, TEMPLATES };
