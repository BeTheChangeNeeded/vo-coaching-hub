// Transformation Anchors — the foundation exercises (goal, guardrails, mindsets,
// life wheel, declarations, show-do-teach) rendered via the Exercise Player.
(function () {
  function render(container, ctx) {
    const s = Content.section('anchors');
    if (!s) { container.innerHTML = '<div class="card">Not found.</div>'; return; }
    const prog = Store.progressFor(s.exercises);
    const hero = document.createElement('div'); hero.className = 'hero';
    hero.innerHTML = `<h2>${s.icon || '⚓'} ${s.title}</h2><p>${s.intro || ''}</p>` +
      `<div class="progress"><span style="width:${prog.pct}%"></span></div>` +
      `<div class="progress-label">${prog.done} of ${prog.total} prompts started · ${prog.pct}% complete</div>`;
    container.appendChild(hero);

    s.exercises.forEach((ex) => ExercisePlayer.renderExercise(container, ex, {
      go: ctx.go,
      sectionId: 'anchors',
      onSave: () => { const p = Store.progressFor(s.exercises); const b = hero.querySelector('.progress > span'); if (b) b.style.width = p.pct + '%'; const l = hero.querySelector('.progress-label'); if (l) l.textContent = `${p.done} of ${p.total} prompts started · ${p.pct}% complete`; },
    }));

    const foot = document.createElement('div'); foot.className = 'card';
    foot.innerHTML = `<p class="muted" style="margin:0 0 10px">With your foundation set, you're ready to begin the journey.</p>`;
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Begin with Identity →'; b.onclick = () => ctx.go('identity');
    foot.appendChild(b); container.appendChild(foot);
  }
  window.Tools = window.Tools || {};
  window.Tools['anchors'] = { render };
})();
