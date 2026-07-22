// Curated coaching resources, organized by journey section and (optionally)
// targeted to a track. Public read for signed-in users; ADMINS can edit/add.
// Stored as one JSON blob; the frontend merges these with each track's built-in
// resource list. Entries can be clickable links (url) or uploaded downloads.
const ws = require('../_shared/wsstore');

const BLOB = 'appdata__coaching_resources.json';
const SECTIONS = ['general', 'anchors', 'identity', 'mission', 'calling', 'vision', 'launch', 'assessment'];

module.exports = async function (context, req) {
  try {
    const p = ws.principal(req);
    const canEdit = ws.isAdmin(ws.emailOf(p));

    if (req.method === 'PUT') {
      if (!canEdit) { context.res = { status: 403, body: { error: 'Admin access only.' } }; return; }
      const list = ((req.body && req.body.resources) || [])
        .filter((r) => r && r.title && (r.url || r.fileUrl))
        .map((r) => ({
          id: r.id || ('r' + Date.now() + Math.floor(Math.random() * 1000)),
          section: SECTIONS.includes(r.section) ? r.section : 'general',
          tracks: Array.isArray(r.tracks) ? r.tracks.filter(Boolean).slice(0, 5) : [],
          type: String(r.type || 'Link').slice(0, 40),
          title: String(r.title).slice(0, 200),
          url: String(r.url || r.fileUrl || '').slice(0, 800),
          download: !!r.download || !!r.fileUrl,
          description: String(r.description || '').slice(0, 600),
        }))
        .slice(0, 500);
      await ws.writeJson(BLOB, { resources: list, updatedAt: new Date().toISOString() });
      context.res = { status: 200, body: { ok: true, count: list.length } };
      return;
    }

    let data = null;
    try { data = ws.configured() ? await ws.readJson(BLOB) : null; } catch (e) { context.log.error('resources read', e); }
    const resources = (data && Array.isArray(data.resources)) ? data.resources : [];
    context.res = { status: 200, body: { resources, sections: SECTIONS, canEdit } };
  } catch (err) {
    context.log.error('resources failed', err);
    context.res = { status: err.statusCode || 500, body: { error: err.message } };
  }
};
