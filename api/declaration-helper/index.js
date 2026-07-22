const { completeJSON } = require('../_shared/claude');
const { COACH_IDENTITY, trackFraming } = require('../_shared/coaching-prompts');

// Turns a limiting belief into a truth-filled declaration, using the TriMetrix
// axiology "15 distortions + reversing questions" framework. Optionally names the
// likely distortion so the coachee can spot the pattern next time.
const SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    distortion: { type: 'string', description: 'The most likely thinking distortion (e.g. Catastrophizing, Should\'s, Black & White).' },
    reframe: { type: 'string', description: 'A one-sentence reframe / the truth.' },
    declaration: { type: 'string', description: 'A first-person, present-tense declaration they can speak daily.' },
    reversingQuestion: { type: 'string', description: 'A question that reverses the distortion.' },
  },
  required: ['reframe', 'declaration'],
};

module.exports = async function (context, req) {
  try {
    const b = req.body || {};
    if (!b.limitingBelief) { context.res = { status: 400, body: { error: 'limitingBelief is required.' } }; return; }
    const framing = trackFraming(b.trackId, b.coachInstructions);
    const system = COACH_IDENTITY + '\n\n' + framing +
      '\n\nUse the VisionOne TriMetrix mindset framework (15 common distortions of reality, each with reversing questions). ' +
      'Given a limiting belief, identify the likely distortion, give the truth that reverses it, a reversing question, and a first-person present-tense declaration they can speak daily.' +
      (framing.includes('faith') || b.trackId === 'ministry' ? ' A Scripture-anchored declaration is welcome.' : '');
    const result = await completeJSON({ provider: b.provider, tier: 'generate', maxTokens: 500, system, schema: SCHEMA, messages: [{ role: 'user', content: `Limiting belief: "${b.limitingBelief}"` }] });
    context.res = { status: 200, body: result };
  } catch (err) {
    context.log.error('declaration-helper failed', err);
    context.res = { status: err.statusCode || 500, body: { error: err.message } };
  }
};
