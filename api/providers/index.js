const { listProviders, defaultProvider } = require('../_shared/claude');

// Reports which AI providers have credentials configured, so the UI can offer
// only the usable ones for A/B testing (and pick a sensible default).
module.exports = async function (context, req) {
  try {
    context.res = { status: 200, body: { providers: listProviders(), default: defaultProvider() } };
  } catch (err) {
    context.res = { status: 500, body: { error: err.message } };
  }
};
