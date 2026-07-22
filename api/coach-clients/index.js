// Coach dashboard: list the clients who have shared their workspace with the
// signed-in coach (consent re-verified against each client's live workspace).
const ws = require('../_shared/wsstore');

module.exports = async function (context, req) {
  try {
    if (!ws.configured()) { context.res = { status: 501, body: { error: 'Not configured.' } }; return; }
    const p = ws.principal(req); const email = ws.emailOf(p);
    if (!p) { context.res = { status: 401, body: { error: 'Sign in.' } }; return; }
    if (!ws.isCoach(email)) { context.res = { status: 403, body: { error: 'Coach access only.' } }; return; }

    const pointers = await ws.listClientsForCoach(email);
    const clients = [];
    for (const c of pointers) {
      try {
        const doc = await ws.readDoc(c.userId);
        const w = (doc && doc.workspace) || {};
        const sh = w.sharing;
        if (!(sh && sh.consent && String(sh.coachEmail || '').toLowerCase() === email)) continue; // consent revoked
        clients.push({
          userId: c.userId,
          email: (doc.user && doc.user.details) || c.email || '',
          name: (w.profile && w.profile.name) || c.name || '',
          targetRole: (w.profile && w.profile.targetRole) || (w.profile && w.profile.currentRole) || '',
          resumeVersions: (w.resumeVersions || []).length,
          notes: (w.coachingNotes || []).length,
          updatedAt: doc.updatedAt || null,
        });
      } catch (e) { /* skip unreadable */ }
    }
    clients.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    context.res = { status: 200, body: { clients } };
  } catch (err) { context.log.error('coach-clients', err); context.res = { status: err.statusCode || 500, body: { error: err.message } }; }
};
