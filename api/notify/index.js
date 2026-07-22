const { sendNotification } = require('../_shared/notifications');

// HTTP-triggered transactional email. The frontend calls this after key events
// (profile created, resume tailored, interview finished). Fire-and-forget on the
// client — failures here never block the user.
module.exports = async function (context, req) {
  try {
    const { type, to, data, tenant, attachments } = req.body || {};
    if (!type || !to) {
      context.res = { status: 400, body: { error: 'type and to are required.' } };
      return;
    }
    const result = await sendNotification({ type, to, data, tenant, attachments, context });
    context.res = { status: 200, body: result };
  } catch (err) {
    context.log.error('notify failed', err);
    context.res = { status: err.statusCode || 500, body: { error: err.message } };
  }
};
