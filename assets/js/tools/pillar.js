// Pillar tool — renders one of the five journey pillars (Identity, Mission,
// Calling, Vision, Launch) as a sequence of exercises via the Exercise Player.
// One implementation serves all five; each pillar id registers into window.Tools.
(function () {
  function renderPillar(pillarId, container, ctx) {
    const s = Content.section(pillarId);
    if (!s) { container.innerHTML = '<div class="card">Section not found.</div>'; return; }

    const prog = Store.progressFor(s.exercises);
    const intro = document.createElement('div');
    intro.className = 'hero';
    intro.innerHTML =
      `<h2>${s.icon || ''} ${s.title}</h2>` +
      (s.statement ? `<p style="color:var(--primary-deep);font-weight:700;font-size:15px">${s.statement}</p>` : '') +
      `<p>${s.intro || ''}</p>` +
      `<div class="progress"><span style="width:${prog.pct}%"></span></div>` +
      `<div class="progress-label">${prog.done} of ${prog.total} prompts started · ${prog.pct}% complete</div>`;
    container.appendChild(intro);

    s.exercises.forEach((ex) => {
      ExercisePlayer.renderExercise(container, ex, {
        go: ctx.go,
        sectionId: pillarId,
        onSave: () => {
          const p = Store.progressFor(s.exercises);
          const bar = intro.querySelector('.progress > span'); if (bar) bar.style.width = p.pct + '%';
          const lbl = intro.querySelector('.progress-label'); if (lbl) lbl.textContent = `${p.done} of ${p.total} prompts started · ${p.pct}% complete`;
        },
      });
    });

    // Footer: next pillar / reflect nudge
    const order = Content.pillars();
    const idx = order.indexOf(pillarId);
    const foot = document.createElement('div'); foot.className = 'card';
    foot.innerHTML = `<p class="muted" style="margin:0 0 10px">Take your time — you can return to any prompt later. Everything autosaves.</p>`;
    const row = document.createElement('div'); row.className = 'btn-row';
    if (idx >= 0 && idx < order.length - 1) {
      const next = document.createElement('button'); next.className = 'btn'; next.textContent = 'Continue to ' + Content.section(order[idx + 1]).title + ' →';
      next.onclick = () => ctx.go(order[idx + 1]); row.appendChild(next);
    }
    const rep = document.createElement('button'); rep.className = 'btn ghost'; rep.textContent = 'Generate a summary of this section';
    rep.onclick = () => ctx.go('reports'); row.appendChild(rep);
    foot.appendChild(row);
    container.appendChild(foot);
  }

  // Register all five pillars.
  ['identity', 'mission', 'calling', 'vision', 'launch'].forEach((id) => {
    window.Tools = window.Tools || {};
    window.Tools[id] = { render: (el, ctx) => renderPillar(id, el, ctx) };
  });
})();
