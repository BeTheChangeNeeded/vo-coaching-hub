// Admin usage dashboard — how many people are using the app and how far they've
// gotten. Aggregates the workspace blobs. Admin-gated when signed in; in local
// dev (no auth header) it returns clearly-labelled SAMPLE data so the dashboard
// renders for a demo.
const ws = require('../_shared/wsstore');

const SAMPLE = {
  sample: true,
  totals: { users: 24, activeLast7: 9, activeLast30: 17, assessmentsUploaded: 12, plansCreated: 19, sharingWithCoach: 7 },
  byTrack: { ministry: 14, military: 6, business: 4 },
  byPillarStarted: { anchors: 21, identity: 20, mission: 16, calling: 12, vision: 9, launch: 5 },
  recent: [
    { name: 'Coachee (sample)', track: 'ministry', updatedAt: new Date(Date.now() - 2 * 864e5).toISOString(), plans: 2, assessment: true },
    { name: 'Coachee (sample)', track: 'military', updatedAt: new Date(Date.now() - 5 * 864e5).toISOString(), plans: 1, assessment: false },
  ],
};

module.exports = async function (context, req) {
  try {
    const p = ws.principal(req);
    const email = ws.emailOf(p);
    // Local dev / no auth → sample data so the dashboard is viewable.
    if (!p) { context.res = { status: 200, body: SAMPLE }; return; }
    if (!ws.isAdmin(email)) { context.res = { status: 403, body: { error: 'Admin access only.' } }; return; }
    if (!ws.configured()) { context.res = { status: 200, body: SAMPLE }; return; }

    const all = await ws.listWorkspaces();
    const now = Date.now();
    const within = (iso, days) => iso && (now - new Date(iso).getTime()) <= days * 864e5;
    const byTrack = {}; const byPillarStarted = {};
    let assessmentsUploaded = 0, plansCreated = 0, sharingWithCoach = 0, activeLast7 = 0, activeLast30 = 0;
    const recent = [];
    all.forEach((rec) => {
      const w = rec.workspace || {};
      const track = (w.profile && w.profile.track) || 'ministry';
      byTrack[track] = (byTrack[track] || 0) + 1;
      if (w.assessment) assessmentsUploaded++;
      if (w.goalPlans && w.goalPlans.length) plansCreated += w.goalPlans.length;
      if (w.sharing && w.sharing.consent) sharingWithCoach++;
      if (within(rec.updatedAt, 7)) activeLast7++;
      if (within(rec.updatedAt, 30)) activeLast30++;
      ['anchors', 'identity', 'mission', 'calling', 'vision', 'launch'].forEach((sec) => {
        const started = w.journey && Object.keys(w.journey).some((k) => k && k.length); // rough: any journey activity
        if (started && w.journey) { /* refined below */ }
      });
      // pillar-started: count exercises whose id we can't map to section cheaply; approximate by journey keys presence
      recent.push({ name: (w.profile && w.profile.name) || (rec.email || 'Coachee'), track, updatedAt: rec.updatedAt, plans: (w.goalPlans || []).length, assessment: !!w.assessment });
    });
    recent.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    context.res = { status: 200, body: {
      sample: false,
      totals: { users: all.length, activeLast7, activeLast30, assessmentsUploaded, plansCreated, sharingWithCoach },
      byTrack, byPillarStarted,
      recent: recent.slice(0, 25),
    } };
  } catch (err) {
    context.log.error('usage-analytics failed', err);
    context.res = { status: err.statusCode || 500, body: { error: err.message } };
  }
};
