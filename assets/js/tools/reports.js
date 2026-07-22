// Reports & Summaries — generate AI syntheses of the journey: an Identity summary,
// a full Journey summary, and "Themes & Gold" across the reflective tabs. Generated
// section-by-section to stay under the serverless time limit. Saved for revisiting.
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const md = (s) => window.marked ? marked.parse(s || '') : esc(s);

  const REPORTS = [
    { id: 'journey', title: 'Full Journey Summary', desc: 'A synthesis of your Identity, Mission, Calling, Vision, and Launch work.', sections: ['identity', 'mission', 'calling', 'vision', 'launch'] },
    { id: 'identity', title: 'Identity Summary', desc: 'Who you are — design, strengths, and values, in one page.', sections: ['identity'] },
    { id: 'themes', title: 'Themes & Gold', desc: 'Recurring themes and "gold" across your journal, dreams, and declarations.', sections: ['themes'] },
  ];

  function render(container, ctx) {
    const head = document.createElement('div'); head.className = 'card';
    head.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">📝 Reports & Summaries</h3><p class="muted" style="margin:0">Turn your reflections into a shareable summary. Great to review with a coach.</p>`;
    container.appendChild(head);

    const grid = document.createElement('div'); grid.className = 'journey-grid';
    REPORTS.forEach((r) => {
      const c = document.createElement('div'); c.className = 'journey-card';
      c.innerHTML = `<h4>${esc(r.title)}</h4><div class="jc-tag">${esc(r.desc)}</div>`;
      c.onclick = () => generate(r);
      grid.appendChild(c);
    });
    container.appendChild(grid);

    const out = document.createElement('div'); out.id = 'reportOut'; container.appendChild(out);

    // Saved reports
    const saved = Store.getReports();
    if (saved.length) {
      const s = document.createElement('div'); s.className = 'card';
      s.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 10px">Saved reports</h3>`;
      saved.forEach((rep) => {
        const row = document.createElement('div'); row.className = 'list-note';
        row.innerHTML = `<div style="flex:1"><b>${esc(rep.title)}</b><div class="when">${new Date(rep.createdAt).toLocaleString()}</div></div>`;
        const v = document.createElement('button'); v.className = 'btn ghost small'; v.textContent = 'View'; v.onclick = () => showReport(rep);
        const d = document.createElement('button'); d.className = 'iconbtn ghost'; d.textContent = '✕'; d.onclick = () => { Store.deleteReport(rep.id); render(container, ctx); };
        row.appendChild(v); row.appendChild(d); s.appendChild(row);
      });
      container.appendChild(s);
    }

    async function generate(r) {
      const out = document.getElementById('reportOut');
      out.innerHTML = `<div class="card"><div class="ai-assist-label">Generating: ${esc(r.title)}</div><div class="progress"><span style="width:0%"></span></div><div class="progress-label" id="rpLabel">Preparing…</div><div id="rpBody" class="md"></div></div>`;
      const bar = out.querySelector('.progress > span'); const label = out.querySelector('#rpLabel'); const body = out.querySelector('#rpBody');
      const material = gatherMaterial(r.sections);
      if (!material.trim()) { label.textContent = 'Nothing to summarize yet — complete some reflections first.'; return; }
      const track = Content.track();
      let full = '';
      try {
        for (let i = 0; i < r.sections.length; i++) {
          const sec = r.sections[i];
          label.textContent = `Writing ${i + 1} of ${r.sections.length}…`;
          const res = await Api.journeySummary({ reportType: r.id, section: sec, material: gatherMaterial([sec]), trackId: track.id, coachInstructions: track.coachInstructions, name: Store.getProfile().name });
          full += (res.markdown || '') + '\n\n';
          body.innerHTML = md(full);
          bar.style.width = Math.round(((i + 1) / r.sections.length) * 100) + '%';
        }
        Store.saveReport({ title: r.title, markdown: full });
        label.textContent = 'Done — saved to your reports.';
        const actions = document.createElement('div'); actions.className = 'btn-row';
        const print = document.createElement('button'); print.className = 'btn ghost'; print.textContent = '🖨 PDF';
        print.onclick = () => UI.openPrintDoc({ title: r.title, footer: 'VisionOne Coaching Hub', bodyHtml: md(full) });
        const word = document.createElement('button'); word.className = 'btn ghost'; word.textContent = '📄 Word';
        word.onclick = () => UI.downloadWordDoc(r.title, r.title, md(full));
        actions.appendChild(print); actions.appendChild(word); out.querySelector('.card').appendChild(actions);
      } catch (e) {
        label.innerHTML = `<span class="error small">${esc(e.message || 'Report generation failed (the AI backend may not be configured yet).')}</span>`;
      }
    }
  }

  function gatherMaterial(sectionIds) {
    const parts = [];
    sectionIds.forEach((sid) => {
      if (sid === 'themes') {
        Content.tabs().forEach((tb) => { const entries = Store.getTab(tb.id); if (entries.length) parts.push(`## ${tb.title}\n` + entries.map((e) => '- ' + e.text).join('\n')); });
        return;
      }
      const s = Content.section(sid); if (!s) return;
      const block = [];
      s.exercises.forEach((ex) => {
        (ex.steps || []).forEach((st) => {
          const v = Store.getStep(ex.id, st.id); if (!v) return;
          const val = Array.isArray(v) ? v.map((x) => typeof x === 'object' ? JSON.stringify(x) : x).filter(Boolean).join('; ') : (typeof v === 'object' ? JSON.stringify(v) : v);
          if (val && String(val).trim()) block.push(`- ${ex.title} — ${st.label}: ${val}`);
        });
      });
      if (block.length) parts.push(`## ${s.title}\n` + block.join('\n'));
    });
    return parts.join('\n\n');
  }

  function showReport(rep) {
    UI.modal(esc(rep.title), `<div class="btn-row" style="margin-bottom:12px"><button class="btn ghost" id="rpPdf">🖨 PDF</button><button class="btn ghost" id="rpWord">📄 Word</button></div><div class="md">${md(rep.markdown)}</div>`);
    const pdf = document.getElementById('rpPdf'); if (pdf) pdf.onclick = () => UI.openPrintDoc({ title: rep.title, footer: 'VisionOne Coaching Hub', bodyHtml: md(rep.markdown) });
    const word = document.getElementById('rpWord'); if (word) word.onclick = () => UI.downloadWordDoc(rep.title, rep.title, md(rep.markdown));
  }
  window.Tools = window.Tools || {};
  window.Tools['reports'] = { render };
})();
