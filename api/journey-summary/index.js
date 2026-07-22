const { complete } = require('../_shared/claude');
const { COACH_IDENTITY, trackFraming } = require('../_shared/coaching-prompts');

// Generates a section of a journey report (Identity summary, full Journey summary,
// or Themes & Gold) from the coachee's own reflections. One section per call so it
// stays under the serverless time limit; the client assembles the full document.
const SECTION_INTENT = {
  identity: 'Synthesize who this person is — their design, strengths, and core values — in an affirming, insightful way.',
  mission: 'Synthesize their purpose and mission — the "why" and the impact they\'re created to make.',
  calling: 'Synthesize their calling — the specific ways they\'re drawn to express their identity and purpose.',
  vision: 'Synthesize their vision — the future they\'re reaching for, across horizons and legacy.',
  launch: 'Synthesize their launch plan — the commitments and first steps they\'re making.',
  themes: 'Identify the recurring themes and "gold" across their journal entries, dreams, and declarations. Name the patterns they might not see themselves.',
};

module.exports = async function (context, req) {
  try {
    const b = req.body || {};
    if (!b.section || !b.material || String(b.material).trim().length < 10) {
      context.res = { status: 400, body: { error: 'section and material are required (add some reflections first).' } };
      return;
    }
    const framing = trackFraming(b.trackId, b.coachInstructions);
    const intent = SECTION_INTENT[b.section] || 'Summarize this section of their journey.';
    const name = (b.name || 'this person').trim();
    const system = COACH_IDENTITY + '\n\n' + framing +
      `\n\nWrite ONE section of a coaching summary for ${name}, in warm markdown. ${intent} ` +
      'Start with a "## " heading. Base everything strictly on their own words below — quote or paraphrase, do not invent. If the material is thin, keep it short and note what they might explore further. 250-450 words.';
    const markdown = await complete({
      provider: b.provider, tier: 'generate', maxTokens: 1400, system,
      messages: [{ role: 'user', content: `Their reflections for this section:\n\n${String(b.material).slice(0, 12000)}\n\nWrite the section now.` }],
    });
    context.res = { status: 200, body: { section: b.section, markdown } };
  } catch (err) {
    context.log.error('journey-summary failed', err);
    context.res = { status: err.statusCode || 500, body: { error: err.message } };
  }
};
