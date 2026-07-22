// Per-user workspace persistence (profile, resume versions, job/app tracker,
// assessments, coaching notes, coach-sharing consent). One JSON blob per user,
// keyed by the Static Web Apps principal id. GET -> { workspace }, PUT saves it
// and maintains the coach share-pointer when sharing consent changes.
const ws = require('../_shared/wsstore');

module.exports = async function (context, req) {
  try {
    if (!ws.configured()) { context.res = { status: 501, body: { error: 'Workspace persistence is not configured.' } }; return; }
    const p = ws.principal(req);
    if (!p) { context.res = { status: 401, body: { error: 'Sign in to save your workspace.' } }; return; }
    await ws.ensureContainer();

    if (req.method === 'GET') {
      const doc = await ws.readDoc(p.userId);
      context.res = { status: 200, body: { workspace: (doc && doc.workspace) || null, updatedAt: (doc && doc.updatedAt) || null } };
      return;
    }

    // PUT
    const workspace = (req.body && req.body.workspace) || {};
    const prev = await ws.readDoc(p.userId);
    const prevSharing = prev && prev.workspace && prev.workspace.sharing;
    const prevCoach = prevSharing && prevSharing.consent && prevSharing.coachEmail ? String(prevSharing.coachEmail).trim().toLowerCase() : null;

    const doc = { workspace, updatedAt: new Date().toISOString(), user: { id: p.userId, details: p.userDetails, provider: p.identityProvider } };
    await ws.writeDoc(p.userId, doc);

    try {
      await ws.reconcileShare({
        userId: p.userId,
        name: (workspace.profile && workspace.profile.name) || '',
        email: p.userDetails || '',
        prevCoachEmail: prevCoach,
        sharing: workspace.sharing,
      });
    } catch (e) { context.log.error('share reconcile failed', e); }

    context.res = { status: 200, body: { ok: true } };
  } catch (err) {
    context.log.error('workspace failed', err);
    context.res = { status: err.statusCode || 500, body: { error: err.message } };
  }
};
