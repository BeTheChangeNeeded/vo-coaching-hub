const { complete } = require('../_shared/claude');
const { COACH_IDENTITY, SAFETY_AND_SCOPE, trackFraming } = require('../_shared/coaching-prompts');

// Per-field help for a single exercise step. Three modes:
//   reflect  (default) — a few reflective prompts to unstick the coachee
//   examples           — 3-4 concrete example answers for THIS prompt, in this audience's voice
//   ask                — answer the coachee's own question about this field
// Grounded in the coachee's track, demographics, and assessment.
module.exports = async function (context, req) {
  try {
    const b = req.body || {};
    if (!b.stepPrompt) { context.res = { status: 400, body: { error: 'stepPrompt is required.' } }; return; }
    const mode = b.mode || 'reflect';
    const framing = trackFraming(b.trackId, b.coachInstructions);

    let instruction;
    if (mode === 'examples') {
      instruction = 'Give 3-4 concrete EXAMPLE answers to this exact prompt, written in the first person and in language THIS audience would actually use. Return a short markdown bullet list. Keep each example to 1-2 sentences.';
    } else if (mode === 'ask') {
      instruction = 'Answer the coachee\'s question about this exercise/field clearly and briefly (under 140 words), warm and practical. If helpful, include a tiny example.';
    } else {
      instruction = 'Offer 3-4 short, warm reflective prompts or angles to help them think — as a markdown bullet list, under 120 words. Do NOT write their answer for them.';
    }

    const system = COACH_IDENTITY + '\n\n' + framing + '\n\n' + instruction +
      (b.demographics ? `\n\n=== ABOUT THIS PERSON (make it relatable) ===\n${String(b.demographics).slice(0, 700)}` : '') +
      (b.assessment ? `\n\n=== THEIR TRIMETRIX HD ===\n${String(b.assessment).slice(0, 1500)}` : '') +
      (mode === 'ask' ? SAFETY_AND_SCOPE : '');

    const parts = [
      `Exercise: ${b.exerciseTitle || ''}`,
      b.purpose ? `Purpose: ${b.purpose}` : '',
      `Field: ${b.stepLabel || ''} — ${b.stepPrompt}`,
      b.current ? `Their draft so far: ${Array.isArray(b.current) ? b.current.join('; ') : b.current}` : '',
      mode === 'ask' && b.question ? `\nTheir question: ${b.question}` : '',
    ].filter(Boolean).join('\n');

    const suggestions = await complete({ provider: b.provider, tier: 'generate', maxTokens: 500, system, messages: [{ role: 'user', content: parts }] });
    context.res = { status: 200, body: { suggestions } };
  } catch (err) {
    context.log.error('exercise-assist failed', err);
    context.res = { status: err.statusCode || 500, body: { error: err.message } };
  }
};
