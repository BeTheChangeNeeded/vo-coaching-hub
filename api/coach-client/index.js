// Coach dashboard: read one client's workspace — only if that client currently
// consents to sharing with this coach (live re-check, not just the pointer).
const ws = require('../_shared/wsstore');

module.exports = async function (context, req) {
  try {
    if (!ws.configured()) { context.res = { status: 501, body: { error: 'Not configured.' } }; return; }
    const p = ws.principal(req); const email = ws.emailOf(p);
    if (!p) { context.res = { status: 401, body: { error: 'Sign in.' } }; return; }
    if (!ws.isCoach(email)) { context.res = { status: 403, body: { error: 'Coach access only.' } }; return; }

    const userId = (req.query && req.query.userId) || (req.body && req.body.userId);
    if (!userId) { context.res = { status: 400, body: { error: 'userId required.' } }; return; }

    const doc = await ws.readDoc(userId);
    const w = doc && doc.workspace;
    const sh = w && w.sharing;
    if (!w || !(sh && sh.consent && String(sh.coachEmail || '').toLowerCase() === email)) {
      context.res = { status: 403, body: { error: 'This client has not shared their workspace with you.' } }; return;
    }
    // Honor the coachee's chosen sharing scopes — only return what they opted to share.
    // Default (no scopes set) = share everything except private journal entries.
    const scopes = (sh.scopes && typeof sh.scopes === 'object') ? sh.scopes : { journey: true, assessment: true, reports: true, goals: true, journal: false };
    const shared = { profile: w.profile || {}, sharing: { consent: true } }; // profile always visible so the coach knows who this is
    if (scopes.journey) shared.journey = w.journey || {};
    if (scopes.assessment) shared.assessment = w.assessment || null;
    if (scopes.reports) shared.reports = w.reports || [];
    if (scopes.goals) shared.goalPlans = w.goalPlans || [];
    if (scopes.journal) shared.tabs = w.tabs || {};
    shared.coachingNotes = w.coachingNotes || []; // notes are a two-way channel, always shared
    shared.coachingSessions = w.coachingSessions || []; // logged sessions, always shared
    if (scopes.goals) shared._goalProgress = true;
    context.res = { status: 200, body: { workspace: shared, scopes, email: (doc.user && doc.user.details) || '', updatedAt: doc.updatedAt || null } };
  } catch (err) { context.log.error('coach-client', err); context.res = { status: err.statusCode || 500, body: { error: err.message } }; }
};
