const { completeJSON } = require('../_shared/claude');
const { COACH_IDENTITY, trackFraming } = require('../_shared/coaching-prompts');

// Powers the per-exercise "What is this?" (explain in depth) and "See examples"
// buttons. Returns a structured, track-aware explainer + concrete example answers
// so people who find the questions hard have a clear on-ramp. Cached client-side
// per (track + exercise) to avoid repeat calls.
const SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    whatItIs: { type: 'string', description: 'Plain-language explanation of what this exercise/concept is (2-4 sentences).' },
    whyItMatters: { type: 'string', description: 'Why it matters for someone in transition (1-3 sentences).' },
    howToRecognize: { type: 'string', description: 'How to recognize/approach it — practical cues and tips.' },
    examples: { type: 'array', items: { type: 'string' }, description: '3-5 concrete example answers, written in the first person, appropriate to this audience.' },
  },
  required: ['whatItIs', 'whyItMatters', 'examples'],
};

module.exports = async function (context, req) {
  try {
    const b = req.body || {};
    if (!b.exerciseTitle) { context.res = { status: 400, body: { error: 'exerciseTitle is required.' } }; return; }
    const framing = trackFraming(b.trackId, b.coachInstructions);
    const demo = b.demographics ? `\n\n=== ABOUT THIS PERSON (use to make examples relatable) ===\n${String(b.demographics).slice(0, 800)}` : '';
    const system = COACH_IDENTITY + '\n\n' + framing +
      '\n\nA coachee may find this exercise hard to answer. Explain it simply and give concrete example answers written in language THIS audience would actually use. ' +
      'Keep it warm and encouraging. Examples must fit the audience (e.g. a transitioning service member vs. a ministry leader vs. a business leader).' + demo;
    const user = `Exercise: "${b.exerciseTitle}"\n${b.purpose ? 'Purpose: ' + b.purpose + '\n' : ''}${b.stepPrompt ? 'Key prompt: ' + b.stepPrompt : ''}\n\nExplain it and give examples.`;
    const result = await completeJSON({ provider: b.provider, tier: 'generate', maxTokens: 900, system, schema: SCHEMA, messages: [{ role: 'user', content: user }] });
    context.res = { status: 200, body: result };
  } catch (err) {
    context.log.error('explain failed', err);
    context.res = { status: err.statusCode || 500, body: { error: err.message } };
  }
};
