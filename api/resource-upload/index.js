// Admin uploads a resource document (PDF/Word/PPT/etc). Stored as a blob;
// returns a URL the resource entry can link to (served by /api/resource-file).
const ws = require('../_shared/wsstore');

module.exports = async function (context, req) {
  try {
    if (!ws.configured()) { context.res = { status: 501, body: { error: 'Storage not configured.' } }; return; }
    if (!ws.isAdmin(ws.emailOf(ws.principal(req)))) { context.res = { status: 403, body: { error: 'Admin access only.' } }; return; }

    const { filename, contentType, base64 } = req.body || {};
    if (!filename || !base64) { context.res = { status: 400, body: { error: 'filename and base64 are required.' } }; return; }
    const buf = Buffer.from(base64, 'base64');
    if (!buf.length) { context.res = { status: 400, body: { error: 'Empty file.' } }; return; }
    if (buf.length > 8 * 1024 * 1024) { context.res = { status: 413, body: { error: 'File too large (max 8 MB).' } }; return; }

    const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'file';
    const blob = `resfile__${Date.now()}__${safe}`;
    await ws.putBlobBin(blob, buf, contentType || 'application/octet-stream');
    context.res = { status: 200, body: { url: `/api/resource-file?f=${encodeURIComponent(blob)}`, name: filename } };
  } catch (err) {
    context.log.error('resource-upload failed', err);
    context.res = { status: err.statusCode || 500, body: { error: err.message } };
  }
};
