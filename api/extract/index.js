const { extractText } = require('../_shared/extract');

// Accepts { filename, base64, contentType } and returns { text }.
module.exports = async function (context, req) {
  try {
    const { filename, base64, contentType } = req.body || {};
    const text = await extractText({ filename, base64, contentType });
    if (!text) { context.res = { status: 422, body: { error: 'Could not read any text from that file.' } }; return; }
    context.res = { status: 200, body: { text } };
  } catch (err) {
    context.log.error('extract failed', err);
    context.res = { status: err.statusCode || 500, body: { error: err.message } };
  }
};
