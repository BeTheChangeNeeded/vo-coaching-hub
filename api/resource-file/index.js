// Serves an uploaded resource document to signed-in users (SWA gates /api/* to
// authenticated). Streams the blob back with its content type.
const ws = require('../_shared/wsstore');

module.exports = async function (context, req) {
  try {
    if (!ws.configured()) { context.res = { status: 501, body: { error: 'Storage not configured.' } }; return; }
    const f = (req.query && req.query.f) || '';
    if (!/^resfile__[0-9]+__[a-zA-Z0-9._-]+$/.test(f)) { context.res = { status: 400, body: { error: 'Bad file id.' } }; return; }
    const b = await ws.getBlobBin(f);
    if (!b) { context.res = { status: 404, body: { error: 'Not found.' } }; return; }
    const name = f.replace(/^resfile__[0-9]+__/, '');
    context.res = {
      status: 200,
      headers: { 'Content-Type': b.contentType, 'Content-Disposition': `inline; filename="${name}"`, 'Cache-Control': 'private, max-age=3600' },
      isRaw: true,
      body: b.buffer,
    };
  } catch (err) {
    context.log.error('resource-file failed', err);
    context.res = { status: err.statusCode || 500, body: { error: err.message } };
  }
};
