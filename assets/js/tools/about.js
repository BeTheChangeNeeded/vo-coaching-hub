// Introduction — what the app is, why it matters, the process, and best practices.
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function render(container, ctx) {
    const track = Content.track();
    const meta = Content.meta();

    const hero = document.createElement('div'); hero.className = 'hero';
    hero.innerHTML = `<h2>Welcome to the VisionOne Coaching Hub ✨</h2>
      <p>${esc(meta.subtitle || '')}</p>
      <p>You're on the <b>${esc(track.name)}</b> path (${esc(track.audience)}). ${esc(track.tagline)}</p>`;
    const start = document.createElement('button'); start.className = 'btn'; start.textContent = 'Start here →'; start.onclick = () => ctx.go('guided');
    const switchBtn = document.createElement('button'); switchBtn.className = 'btn ghost'; switchBtn.textContent = 'Change my path'; switchBtn.onclick = () => ctx.go('guided');
    const row = document.createElement('div'); row.className = 'btn-row'; row.appendChild(start); row.appendChild(switchBtn); hero.appendChild(row);
    container.appendChild(hero);

    container.appendChild(section('What this is', `
      <p>The Coaching Hub is a guided journey that helps you move from <b>who you are</b> to <b>the impact you'll make</b>. It's built on VisionOne's proven <i>Identity to Impact</i> process and the <b>TriMetrix HD</b> assessment, and it walks you — with a coach alongside you — through five stages:</p>
      <ul>
        <li><b>Identity</b> — who you are: your design, strengths, and values.</li>
        <li><b>Purpose & Mission</b> — your <i>why</i>: the impact you're made to make.</li>
        <li><b>${esc(Content.sectionTitle('calling'))}</b> — what you're uniquely called to.</li>
        <li><b>Vision & Assignment</b> — the future you're reaching for.</li>
        <li><b>Launch</b> — the concrete plan you commit to now.</li>
      </ul>`));

    container.appendChild(section('Why it matters', `
      <p>Transitions — a career change, leaving the service, a new leadership role, a new season of life — can leave us unclear and drifting. This journey gives you clarity and momentum:</p>
      <ul>
        <li><b>Without identity</b>, we live in confusion. <b>Without mission</b>, we drift. <b>Without ${esc(Content.t('{{calling}}'))}</b>, we lack focus. <b>Without vision</b>, we lose direction.</li>
        <li>Research shows people who <b>write down goals</b> are 42% more likely to achieve them, and that <b>accountability + regular check-ins</b> raise follow-through to as high as 95%.</li>
        <li>Your <b>TriMetrix HD</b> results make it personal — the coaching adapts to how you're actually wired.</li>
      </ul>`));

    container.appendChild(section('The process', `
      <ol>
        <li><b>Start Here</b> — tell us about you and choose your path. This personalizes the language and examples.</li>
        <li><b>Transformation Anchors</b> — set your goal, guardrails, and mindset before you dig in.</li>
        <li><b>Upload your TriMetrix HD</b> — get an AI debrief that tailors the whole journey.</li>
        <li><b>Work the five stages</b> — one section at a time. Every prompt autosaves.</li>
        <li><b>Journal & check in weekly</b> — capture insights, gratitude, dreams, and declarations.</li>
        <li><b>Build your plan</b> — set goals you can version as they evolve.</li>
        <li><b>Generate summaries</b> and review them with your coach.</li>
      </ol>`));

    container.appendChild(section('Best practices', `
      <ul>
        <li><b>Don't overthink.</b> If a question doesn't land, use <b>💡 See examples</b> or <b>❓ What is this?</b> on any exercise, or skip and come back.</li>
        <li><b>Use your voice.</b> Every field has a 🎤 dictate button — talk it out.</li>
        <li><b>Be honest.</b> Growth requires vulnerability. This is your private space unless you choose to share it.</li>
        <li><b>Invite others in.</b> Share your journey with a coach for encouragement and accountability.</li>
        <li><b>Revisit often.</b> Come back to the Life Wheel and your goals each season — this is a living document.</li>
        <li><b>Celebrate progress.</b> Small, consistent steps create momentum.</li>
      </ul>`));

    const grid = document.createElement('div'); grid.className = 'journey-grid';
    [['⚓', 'anchors'], ['🧭', 'identity'], ['🎯', 'mission'], ['🌟', 'calling'], ['🔭', 'vision'], ['🚀', 'launch']].forEach(([icon, id]) => {
      const s = Content.section(id); if (!s) return;
      const c = document.createElement('div'); c.className = 'journey-card';
      c.innerHTML = `<div class="jc-icon">${icon}</div><h4>${esc(s.title)}</h4><div class="jc-tag">${esc(s.tagline || s.intro || '')}</div>`;
      c.onclick = () => ctx.go(id); grid.appendChild(c);
    });
    container.appendChild(grid);
  }

  function section(title, html) {
    const c = document.createElement('div'); c.className = 'card';
    c.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 10px">${esc(title)}</h3><div class="md">${html}</div>`;
    return c;
  }
  window.Tools = window.Tools || {};
  window.Tools['about'] = { render };
})();
