// TriMetrix HD — the primary assessment. Upload or paste the TTI report, get an
// AI debrief adapted to the coaching journey, and request a new assessment or a
// live debrief with a coach. The parsed assessment personalizes the whole app.
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const list = (arr) => (arr && arr.length) ? '<ul class="md">' + arr.map((x) => `<li>${esc(typeof x === 'string' ? x : (x.title || JSON.stringify(x)))}</li>`).join('') + '</ul>' : '<p class="muted small">—</p>';

  function render(container, ctx) {
    const a = Store.getAssessment();

    // Intro
    const intro = document.createElement('div'); intro.className = 'card';
    intro.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">🧬 TriMetrix HD</h3>
      <p class="muted" style="margin:0">TriMetrix HD is your primary assessment — it reveals how you're wired across behaviors (DISC), driving forces, and mindset/acumen. Upload your TTI report for a debrief that adapts your whole journey to you.</p>`;
    container.appendChild(intro);

    // Upload / paste
    const up = document.createElement('div'); up.className = 'card';
    up.innerHTML = `<div class="step-label">Upload or paste your TriMetrix HD report</div><div class="step-prompt">PDF or Word from the TTI portal. We read it in your browser; only the text is sent for the debrief.</div>`;
    const ta = document.createElement('textarea'); ta.className = 'input'; ta.rows = 5; ta.placeholder = 'Paste your report text here, or use “Upload PDF / Word”.';
    if (a && a.rawText) ta.value = a.rawText;
    up.appendChild(ta);
    if (window.UI && UI.addInputTools) UI.addInputTools(ta, { upload: true, mic: false });
    const genRow = document.createElement('div'); genRow.className = 'btn-row';
    const gen = document.createElement('button'); gen.className = 'btn'; gen.textContent = a ? 'Regenerate debrief' : 'Generate my debrief';
    genRow.appendChild(gen); up.appendChild(genRow);
    const out = document.createElement('div'); up.appendChild(out);
    container.appendChild(up);

    gen.onclick = async () => {
      const report = ta.value.trim();
      if (report.length < 40) { out.innerHTML = '<div class="error small">Please upload or paste your report first.</div>'; return; }
      gen.disabled = true; gen.textContent = 'Analyzing…';
      out.innerHTML = '<p class="muted">Reading your TriMetrix HD and preparing a personalized debrief…</p>';
      try {
        const p = Store.getProfile();
        const res = await Api.trimetrixReport({ report, mode: 'coaching', profile: { name: p.name, track: Store.getTrack(), transitionContext: p.transitionContext } });
        Store.setAssessment({ rawText: report, structured: res, report: res.summary || '' });
        toast('Debrief saved to your journey');
        renderDebrief(out, res);
      } catch (e) {
        out.innerHTML = `<div class="error">${esc(e.message || 'Could not generate the debrief.')}</div>`;
      } finally { gen.disabled = false; gen.textContent = 'Regenerate debrief'; }
    };

    if (a && a.structured) renderDebrief(out, a.structured);

    // Report Library — multiple focused summaries, each in the coachee's language.
    renderReportLibrary(container);

    // Requests for a new assessment / debrief live in the Coach Dashboard (single home).
    const req = document.createElement('div'); req.className = 'card';
    req.innerHTML = `<p class="muted" style="margin:0 0 10px">Want a fresh assessment or a live debrief with your coach?</p>`;
    const b = document.createElement('button'); b.className = 'btn ghost'; b.textContent = 'Go to requests in the Coach Dashboard →'; b.onclick = () => ctx.go('coach');
    req.appendChild(b); container.appendChild(req);
  }

  const VARIANTS = [
    { id: 'general', title: 'General Summary', desc: 'Who you are and how you\'re wired.' },
    { id: 'strengths', title: 'Strengths & Superpowers', desc: 'Your top strengths and how to leverage them.' },
    { id: 'path', title: 'Path & Fit', desc: 'Best-fit direction for your next season.' },
    { id: 'growth', title: 'Growth & Mindset', desc: 'Blind spots and thinking watch-outs.' },
    { id: 'relationships', title: 'Working With Others', desc: 'Your communication & relationship style.' },
  ];

  function renderReportLibrary(container) {
    const a = Store.getAssessment();
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">📄 Report Library</h3><p class="muted" style="margin:0 0 12px">Generate focused summaries from your TriMetrix HD — each written in your language. You can run several, save them, and download as PDF or Word. Saved reports also appear in <b>Reports & Summaries</b> and are visible to your coach if you're sharing.</p>`;
    if (!a || !a.rawText) {
      card.innerHTML += '<div class="empty">Upload your TriMetrix HD above first, then generate reports here.</div>';
      container.appendChild(card); return;
    }
    const grid = document.createElement('div'); grid.className = 'journey-grid';
    VARIANTS.forEach((v) => {
      const c = document.createElement('div'); c.className = 'journey-card';
      c.innerHTML = `<h4>${esc(v.title)}</h4><div class="jc-tag">${esc(v.desc)}</div>`;
      c.onclick = () => generate(v);
      grid.appendChild(c);
    });
    card.appendChild(grid);
    const out = document.createElement('div'); out.id = 'trmOut'; card.appendChild(out);
    container.appendChild(card);

    async function generate(v) {
      out.innerHTML = `<div class="card soft"><div class="ai-assist-label">Generating: ${esc(v.title)}…</div><p class="muted small">Writing in your ${esc(Content.track().name)} language.</p></div>`;
      try {
        const p = Store.getProfile();
        const res = await Api.trimetrixReport({ variant: v.id, report: a.rawText, profile: { name: p.name, track: Store.getTrack(), transitionContext: p.transitionContext } });
        const markdown = res.markdown || '';
        Store.saveReport({ title: 'TriMetrix — ' + v.title, markdown, kind: 'trimetrix', variant: v.id });
        toast('Saved to your Reports');
        out.innerHTML = `<div class="card soft"><div class="ai-assist-label">${esc(v.title)} ${UI.modelBadge ? UI.modelBadge() : ''}</div><div class="md">${window.marked ? marked.parse(markdown) : esc(markdown)}</div></div>`;
        const row = document.createElement('div'); row.className = 'btn-row';
        const pdf = document.createElement('button'); pdf.className = 'btn ghost'; pdf.textContent = '🖨 PDF'; pdf.onclick = () => UI.openPrintDoc({ title: 'TriMetrix — ' + v.title, footer: 'VisionOne Coaching Hub', bodyHtml: marked.parse(markdown) });
        const word = document.createElement('button'); word.className = 'btn ghost'; word.textContent = '📄 Word'; word.onclick = () => UI.downloadWordDoc('TriMetrix-' + v.title, v.title, marked.parse(markdown));
        row.appendChild(pdf); row.appendChild(word); out.querySelector('.card').appendChild(row);
      } catch (e) { out.innerHTML = `<div class="error">${esc(e.message || 'Report generation failed.')}</div>`; }
    }
  }

  function renderDebrief(out, r) {
    out.innerHTML = `<div class="card soft" style="margin-top:14px">
      <div class="ai-assist-label">Your TriMetrix HD Debrief ${UI.modelBadge ? UI.modelBadge() : ''}</div>
      ${r.summary ? `<div class="md">${window.marked ? marked.parse(r.summary) : esc(r.summary)}</div>` : ''}
      ${r.behavioralStyle ? `<p><b>Behavioral style (DISC):</b> ${esc(r.behavioralStyle)}</p>` : ''}
      ${r.drivingForces ? `<p><b>Top driving forces:</b></p>${list(r.drivingForces)}` : ''}
      ${r.strengths ? `<p><b>Strengths to lean into:</b></p>${list(r.strengths)}` : ''}
      ${r.blindSpots ? `<p><b>Growth edges / blind spots:</b></p>${list(r.blindSpots)}` : ''}
      ${r.mindsetWatchouts ? `<p><b>Mindset watch-outs:</b></p>${list(r.mindsetWatchouts)}` : ''}
      ${r.coachingFocus ? `<p><b>Where coaching can help most:</b></p>${list(r.coachingFocus)}` : ''}
      ${r.reflectionQuestions ? `<p><b>Questions to sit with:</b></p>${list(r.reflectionQuestions)}` : ''}
    </div>`;
  }
  window.Tools = window.Tools || {};
  window.Tools['trimetrix'] = { render };
})();
