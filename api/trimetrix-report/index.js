const { completeJSON, complete } = require('../_shared/claude');
const { TRIMETRIX_COACH_SYSTEM, TRIMETRIX_COACH_SCHEMA, trackFraming, COACH_IDENTITY, REPORT_VARIANTS } = require('../_shared/coaching-prompts');

// The coachee takes/tracks TriMetrix HD on the TTI portal, then uploads or pastes
// their report here. We produce a coaching-oriented debrief that adapts to their
// track (ministry / military / business) and grounds the whole journey in how
// they're wired.
module.exports = async function (context, req) {
  try {
    const { report, profile, provider } = req.body || {};
    if (!report || report.trim().length < 40) {
      context.res = { status: 400, body: { error: 'Please upload or paste your TTI TriMetrix HD report.' } };
      return;
    }
    const p = profile || {};
    const framing = trackFraming(p.track, '');
    const ctxBlock = [
      p.name ? `Name: ${p.name}` : '',
      p.transitionContext ? `Season/transition: ${p.transitionContext}` : '',
    ].filter(Boolean).join('\n');

    // Full TTI HD reports run many pages; cap so the call finishes within the
    // Static Web Apps ~45s limit. The DISC + Driving Forces + acumen narrative is
    // early in the report; this keeps the substance while dropping bulk/graphics.
    const reportText = String(report).slice(0, 14000);

    // Report library: a specific, focused report as markdown (translated to their track).
    const variant = req.body && req.body.variant;
    if (variant && REPORT_VARIANTS[variant]) {
      const spec = REPORT_VARIANTS[variant];
      const system = COACH_IDENTITY + '\n\n=== TRACK FRAMING ===\n' + framing +
        '\n\nYou are writing ONE focused report from a TriMetrix HD assessment, in warm markdown starting with a "# " title. ' + spec.instruction +
        ' Base everything strictly on the report; do not invent. Write in language THIS audience uses.';
      const markdown = await complete({
        provider, tier: 'generate', maxTokens: 1800, system,
        messages: [{ role: 'user', content: `=== TTI TRIMETRIX HD REPORT (may be truncated) ===\n${reportText}\n\n=== COACHEE CONTEXT ===\n${ctxBlock || '(none provided)'}\n\nWrite the "${spec.title}" report now.` }],
      });
      context.res = { status: 200, body: { variant, title: spec.title, markdown } };
      return;
    }

    const result = await completeJSON({
      tier: 'generate', provider, system: TRIMETRIX_COACH_SYSTEM + '\n\n=== TRACK FRAMING ===\n' + framing,
      schema: TRIMETRIX_COACH_SCHEMA, maxTokens: 3200,
      messages: [{ role: 'user', content: `=== TTI TRIMETRIX HD REPORT (may be truncated) ===\n${reportText}\n\n=== COACHEE CONTEXT ===\n${ctxBlock || '(none provided)'}\n\nProduce the coaching debrief.` }],
    });
    context.res = { status: 200, body: result };
  } catch (err) {
    context.log.error('trimetrix-report failed', err);
    context.res = { status: err.statusCode || 500, body: { error: err.message } };
  }
};
