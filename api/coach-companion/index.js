const { completeJSON } = require('../_shared/claude');
const { COACH_IDENTITY, SAFETY_AND_SCOPE, trackFraming } = require('../_shared/coaching-prompts');

// AI Coach Companion chat. Grounded in the coachee's track, journey context, and
// (if uploaded) TriMetrix HD. Mirrors the Career Hub approach: gives grounded
// coaching-level help itself, but hands off to a certified VisionOne human coach
// for deeper work (referToCoach), and follows crisis-safety guardrails.
const SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    answer: { type: 'string', description: 'Warm, concise markdown reply. Answer helpfully first, then end with one question or next step.' },
    referToCoach: {
      type: 'object', additionalProperties: false,
      description: 'Whether to hand off to a certified VisionOne human coach for this topic.',
      properties: { recommend: { type: 'boolean' }, reason: { type: 'string', description: 'Short warm reason shown when recommend is true; empty otherwise.' } },
      required: ['recommend', 'reason'],
    },
    suggestedResources: { type: 'array', items: { type: 'string' }, description: 'Optional: a few resources or in-app areas to explore.' },
  },
  required: ['answer', 'referToCoach'],
};

const HANDOFF =
  '\n\n=== WHEN TO HAND OFF TO A VISIONONE HUMAN COACH ===\n' +
  'Set referToCoach.recommend = true (with a short, warm reason) when the conversation calls for more than general encouragement — specifically when the person:\n' +
  '• is doing deep mindset work — limiting beliefs, identity, confidence, feeling stuck, values conflicts, motivation;\n' +
  '• wants a FULL TriMetrix HD debrief or advanced interpretation (acumen bias/clarity, blind spots, strongholds) — that is the certified coach\'s role;\n' +
  '• faces a major or emotional decision, burnout, grief, or relational conflict;\n' +
  '• has tried your suggestions and still isn\'t making progress, or needs ongoing accountability;\n' +
  '• explicitly asks to talk to a person.\n' +
  'For routine, repeatable help (clarifying a prompt, brainstorming, general encouragement, next steps), keep coaching yourself and set referToCoach.recommend = false. When you do recommend a coach, still answer helpfully first — the hand-off adds a human, it doesn\'t dodge the question.';

module.exports = async function (context, req) {
  try {
    const b = req.body || {};
    if (!b.message) { context.res = { status: 400, body: { error: 'message is required.' } }; return; }
    const framing = trackFraming(b.trackId, b.coachInstructions);
    const system = COACH_IDENTITY + '\n\n' + framing +
      '\n\nYou are in an ongoing coaching conversation. Respond in warm, concise markdown (usually under 200 words). Reflect back what you hear, offer insight, and end with one clarifying question or one concrete next step. Use what you know about them; never invent facts.' +
      (b.context ? `\n\n=== WHAT YOU KNOW ABOUT THEM ===\n${String(b.context).slice(0, 2000)}` : '') +
      (b.assessment ? `\n\n=== THEIR TRIMETRIX HD (personalize with this; for deep interpretation, hand off to a certified coach) ===\n${String(b.assessment).slice(0, 3000)}` : '') +
      HANDOFF + SAFETY_AND_SCOPE;
    const messages = [];
    (b.history || []).slice(-12).forEach((m) => { if (m && m.role && m.content) messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 4000) }); });
    if (!messages.length || messages[messages.length - 1].content !== b.message) messages.push({ role: 'user', content: b.message });
    const result = await completeJSON({ provider: b.provider, tier: 'chat', maxTokens: 900, system, schema: SCHEMA, messages });
    context.res = { status: 200, body: result };
  } catch (err) {
    context.log.error('coach-companion failed', err);
    context.res = { status: err.statusCode || 500, body: { error: err.message } };
  }
};
