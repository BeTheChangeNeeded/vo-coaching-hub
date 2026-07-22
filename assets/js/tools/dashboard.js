// My Journey — the home dashboard: overall progress across all sections, quick
// entry points, assessment status, and next-step nudges.
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function render(container, ctx) {
    const p = Store.getProfile();
    const track = Content.track();
    const hi = p.name ? `Welcome back, ${esc(p.name)}` : 'Your journey';
    const hero = document.createElement('div'); hero.className = 'hero';
    hero.innerHTML = `<h2>${hi} 🌱</h2><p>You're on the <b>${esc(track.name)}</b> path. ${esc(track.tagline)}</p>`;
    container.appendChild(hero);

    // Section progress cards
    const sections = Content.sections();
    const grid = document.createElement('div'); grid.className = 'journey-grid';
    sections.forEach((s) => {
      const prog = Store.progressFor(s.exercises);
      const c = document.createElement('div'); c.className = 'journey-card';
      c.innerHTML = `<div class="jc-icon">${s.icon || '•'}</div><h4>${esc(s.title)}</h4>` +
        (s.statement ? `<div class="jc-statement">${esc(s.statement)}</div>` : '') +
        `<div class="jc-tag">${esc(s.tagline || '')}</div>` +
        `<div class="progress"><span style="width:${prog.pct}%"></span></div><div class="progress-label">${prog.pct}% complete</div>`;
      c.onclick = () => ctx.go(s.id === 'anchors' ? 'anchors' : s.id);
      grid.appendChild(c);
    });
    container.appendChild(grid);

    // Status row: assessment + coach + goals
    const status = document.createElement('div'); status.className = 'card';
    const a = Store.getAssessment();
    const sharing = Store.getSharing();
    const plans = Store.getGoalPlans();
    status.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 12px">Where things stand</h3>`;
    const rows = [
      ['🧬 TriMetrix HD', a ? `<span class="badge ok">Uploaded ${new Date(a.savedAt).toLocaleDateString()}</span>` : `<span class="badge wait">Not yet uploaded</span>`, 'trimetrix', a ? 'Review' : 'Upload'],
      ['🎯 Goals & Plans', plans.length ? `<span class="badge ok">${plans.length} plan(s)</span>` : `<span class="badge wait">None yet</span>`, 'goals', plans.length ? 'Open' : 'Create'],
      ['👥 Coach', sharing.consent ? `<span class="badge ok">Sharing with ${esc(sharing.coachEmail || 'your coach')}</span>` : `<span class="badge wait">Not shared</span>`, 'coach', 'Manage'],
    ];
    rows.forEach(([label, badge, tool, cta]) => {
      const r = document.createElement('div'); r.className = 'list-note';
      r.innerHTML = `<div style="flex:1"><b>${label}</b> &nbsp; ${badge}</div>`;
      const b = document.createElement('button'); b.className = 'btn ghost small'; b.textContent = cta; b.onclick = () => ctx.go(tool);
      r.appendChild(b); status.appendChild(r);
    });
    container.appendChild(status);

    // Next step nudge
    const nudge = document.createElement('div'); nudge.className = 'card';
    const firstIncomplete = sections.find((s) => Store.progressFor(s.exercises).pct < 100);
    nudge.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 8px">Your next step</h3>`;
    const msg = document.createElement('p'); msg.className = 'muted';
    msg.textContent = firstIncomplete ? `Continue with ${firstIncomplete.title}.` : 'You\'ve touched every section — consider generating a full journey summary.';
    nudge.appendChild(msg);
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = firstIncomplete ? ('Continue ' + firstIncomplete.title + ' →') : 'Generate my journey summary →';
    b.onclick = () => ctx.go(firstIncomplete ? firstIncomplete.id : 'reports');
    nudge.appendChild(b); container.appendChild(nudge);
  }
  window.Tools = window.Tools || {};
  window.Tools['dashboard'] = { render };
})();
