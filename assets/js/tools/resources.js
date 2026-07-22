// Resources — track-aware library organized by journey section. Merges each
// track's built-in list with admin-curated resources (links + downloadable
// files) from the server. Exercises deep-link here to their section.
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SECTION_LABELS = { general: 'General', anchors: 'Transformation Anchors', identity: 'Identity', mission: 'Purpose & Mission', calling: 'Calling', vision: 'Vision & Assignment', launch: 'Launch', assessment: 'TriMetrix HD' };
  const ORDER = ['general', 'anchors', 'identity', 'mission', 'calling', 'vision', 'launch', 'assessment'];

  function render(container, ctx) {
    const track = Content.track();
    const head = document.createElement('div'); head.className = 'card';
    head.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">📚 Resources for the ${esc(track.name)} path</h3><p class="muted" style="margin:0">Downloadable worksheets and hand-picked links, organized by section. These adapt to your path — switch paths in the sidebar to see a different set.</p>`;
    container.appendChild(head);

    const body = document.createElement('div'); container.appendChild(body);
    const focus = Store.getSetting('resourceSection'); if (focus) Store.setSetting('resourceSection', ''); // one-time

    // Built-in track resources → section 'general' unless tagged.
    const builtIn = (track.resources || []).map((r) => ({ section: r.section || 'general', type: r.type || 'Resource', title: r.title, description: r.note || '', url: r.url || '', download: false, tracks: [] }));

    function draw(server) {
      const serverList = (server || []).filter((r) => !r.tracks || !r.tracks.length || r.tracks.includes(track.id));
      const all = builtIn.concat(serverList);
      const bySection = {};
      all.forEach((r) => { const s = ORDER.includes(r.section) ? r.section : 'general'; (bySection[s] = bySection[s] || []).push(r); });
      body.innerHTML = '';
      if (!all.length) { body.innerHTML = '<div class="empty">No resources yet. An admin can add links and downloads in the Admin tab.</div>'; return; }
      ORDER.forEach((sec) => {
        const items = bySection[sec]; if (!items || !items.length) return;
        const card = document.createElement('div'); card.className = 'card'; card.dataset.section = sec;
        card.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 12px">${esc(SECTION_LABELS[sec] || sec)}</h3>`;
        const grid = document.createElement('div'); grid.className = 'journey-grid';
        items.forEach((r) => {
          const c = document.createElement('div'); c.className = 'journey-card'; if (r.url) c.style.cursor = 'pointer';
          c.innerHTML = `<div class="jc-statement">${esc(r.type || 'Resource')}</div><h4>${esc(r.title)}</h4><div class="jc-tag">${esc(r.description || '')}</div>` +
            (r.url ? `<div class="badge" style="margin-top:8px">${r.download ? '⬇ Download' : 'Open ↗'}</div>` : '');
          if (r.url) c.onclick = () => window.open(r.url, r.download ? '_self' : '_blank');
          grid.appendChild(c);
        });
        card.appendChild(grid); body.appendChild(card);
      });
      if (focus) { const t = body.querySelector(`[data-section="${focus}"]`); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); t.style.outline = '2px solid var(--primary)'; setTimeout(() => { t.style.outline = 'none'; }, 2000); } }
    }

    draw([]); // instant render with built-ins
    Api.resources().then((d) => draw(d.resources || [])).catch(() => { /* keep built-ins */ });

    const foot = document.createElement('div'); foot.className = 'card';
    foot.innerHTML = `<p class="muted" style="margin:0 0 10px">Want a recommendation tailored to a specific goal?</p>`;
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Ask your AI Coach Companion →'; b.onclick = () => ctx.go('coach-companion');
    foot.appendChild(b); container.appendChild(foot);
  }
  window.Tools = window.Tools || {};
  window.Tools['resources'] = { render };
})();
