// Coach dashboard writes to a client's workspace (consent-gated). Two kinds:
//   • note    (default) → appended to coachingNotes  (encouragement / assignments)
//   • session            → appended to coachingSessions (a logged call/meeting,
//                          with an optional transcript)
// Both are visible to the coachee too (transparency).
const ws = require('../_shared/wsstore');

module.exports = async function (context, req) {
  try {
    if (!ws.configured()) { context.res = { status: 501, body: { error: 'Not configured.' } }; return; }
    const p = ws.principal(req); const email = ws.emailOf(p);
    if (!p) { context.res = { status: 401, body: { error: 'Sign in.' } }; return; }
    if (!ws.isCoach(email)) { context.res = { status: 403, body: { error: 'Coach access only.' } }; return; }

    const b = req.body || {};
    const { userId, kind } = b;
    if (!userId) { context.res = { status: 400, body: { error: 'userId is required.' } }; return; }

    const doc = await ws.readDoc(userId);
    const w = doc && doc.workspace;
    const sh = w && w.sharing;
    if (!w || !(sh && sh.consent && String(sh.coachEmail || '').toLowerCase() === email)) {
      context.res = { status: 403, body: { error: 'This client has not shared their workspace with you.' } }; return;
    }

    if (kind === 'session') {
      if (!b.summary && !b.transcript) { context.res = { status: 400, body: { error: 'A session summary or transcript is required.' } }; return; }
      w.coachingSessions = w.coachingSessions || [];
      w.coachingSessions.unshift({
        summary: String(b.summary || '').slice(0, 12000),
        transcript: String(b.transcript || '').slice(0, 60000),
        sessionDate: b.sessionDate || new Date().toISOString(),
        authorEmail: email, at: new Date().toISOString(),
      });
      w.coachingSessions = w.coachingSessions.slice(0, 100);
    } else {
      if (!b.note || !String(b.note).trim()) { context.res = { status: 400, body: { error: 'note is required.' } }; return; }
      w.coachingNotes = w.coachingNotes || [];
      w.coachingNotes.unshift({ note: String(b.note).slice(0, 8000), authorEmail: email, at: new Date().toISOString() });
      w.coachingNotes = w.coachingNotes.slice(0, 100);
    }
    doc.updatedAt = new Date().toISOString();
    await ws.writeDoc(userId, doc);
    context.res = { status: 200, body: { ok: true } };
  } catch (err) { context.log.error('coach-note', err); context.res = { status: err.statusCode || 500, body: { error: err.message } }; }
};
