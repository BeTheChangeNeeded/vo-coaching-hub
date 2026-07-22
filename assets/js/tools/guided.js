// Start Here — a short orientation that points to Profile (for personalization)
// and launches the journey. The detailed intake now lives in the Profile tab.
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function render(container, ctx) {
    const p = Store.getProfile();
    const track = Content.track();
    const hasProfile = !!(p.name && p.demographics && Object.keys(p.demographics).length);

    const hero = document.createElement('div'); hero.className = 'hero';
    hero.innerHTML = `<h2>Let's begin, ${p.name ? esc(p.name) : 'friend'} 🌱</h2>
      <p>You're on the <b>${esc(track.name)}</b> path. Here's how the journey works — take it one step at a time; everything autosaves and adapts to you.</p>`;
    container.appendChild(hero);

    if (!hasProfile) {
      const nudge = document.createElement('div'); nudge.className = 'card';
      nudge.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">First, set up your Profile</h3><p class="muted" style="margin:0 0 10px">Add your name, a little about you, and (optionally) your coach. This personalizes the language, examples, and coaching throughout.</p>`;
      const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Go to Profile →'; b.onclick = () => ctx.go('profile');
      nudge.appendChild(b); container.appendChild(nudge);
    }

    const steps = [
      ['🧑', 'Profile', 'Tell us about you and choose your path.', 'profile'],
      ['⚓', 'Transformation Anchors', 'Set your goal, guardrails, and mindset.', 'anchors'],
      ['🧬', 'TriMetrix HD', 'Upload your assessment for a personalized debrief.', 'trimetrix'],
      ['🧭', 'The five stages', 'Identity → Purpose → Calling → Vision → Launch.', 'identity'],
      ['📓', 'Journal', 'Reflect, capture insights, and track progress.', 'journal'],
      ['🎯', 'Goals & Plans', 'Turn it into a plan you can version over time.', 'goals'],
    ];
    const grid = document.createElement('div'); grid.className = 'journey-grid';
    steps.forEach(([icon, title, tag, id]) => {
      const c = document.createElement('div'); c.className = 'journey-card';
      c.innerHTML = `<div class="jc-icon">${icon}</div><h4>${esc(title)}</h4><div class="jc-tag">${esc(tag)}</div>`;
      c.onclick = () => ctx.go(id); grid.appendChild(c);
    });
    container.appendChild(grid);

    const foot = document.createElement('div'); foot.className = 'card';
    foot.innerHTML = `<p class="muted" style="margin:0 0 10px">Ready? The best place to begin is your foundation.</p>`;
    const row = document.createElement('div'); row.className = 'btn-row';
    const go = document.createElement('button'); go.className = 'btn'; go.textContent = 'Begin with Transformation Anchors →'; go.onclick = () => ctx.go('anchors');
    const dash = document.createElement('button'); dash.className = 'btn ghost'; dash.textContent = 'Go to My Journey'; dash.onclick = () => ctx.go('dashboard');
    row.appendChild(go); row.appendChild(dash); foot.appendChild(row); container.appendChild(foot);
  }
  window.Tools = window.Tools || {};
  window.Tools['guided'] = { render };
})();
