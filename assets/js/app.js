// App shell: track theming, tool registry, hash router. Tools register into
// window.Tools and appear in nav automatically.
(function () {
  const TOOL_META = {
    'about':          { label: 'Introduction',       icon: '👋' },
    'profile':        { label: 'Profile',            icon: '🧑' },
    'guided':         { label: 'Start Here',         icon: '🚀' },
    'dashboard':      { label: 'My Journey',         icon: '🏠' },
    'anchors':        { label: 'Transformation Anchors', icon: '⚓' },
    'identity':       { label: 'Identity',           icon: '🧭' },
    'mission':        { label: 'Purpose & Mission',  icon: '🎯' },
    'calling':        { label: 'Calling',            icon: '🌟' },
    'vision':         { label: 'Vision & Assignment', icon: '🔭' },
    'launch':         { label: 'Launch',             icon: '🚀' },
    'journal':        { label: 'Journal',            icon: '📓' },
    'trimetrix':      { label: 'TriMetrix HD',       icon: '🧬' },
    'values':         { label: 'Core Values Cards',  icon: '🃏' },
    'goals':          { label: 'Goals & Plans',      icon: '🎯' },
    'coach-companion':{ label: 'AI Coach Companion',  icon: '💬' },
    'reports':        { label: 'Reports & Summaries', icon: '📝' },
    'resources':      { label: 'Resources',          icon: '📚' },
    'coach':          { label: 'Coach Dashboard',    icon: '👥' },
    'admin':          { label: 'Admin',              icon: '🛠️' },
  };

  const NAV_GROUPS = [
    { label: 'Get Started',  ids: ['about', 'profile', 'guided', 'dashboard'] },
    { label: 'Foundation',   ids: ['anchors'] },
    { label: 'The Journey',  ids: ['identity', 'mission', 'calling', 'vision', 'launch'] },
    { label: 'Reflect',      ids: ['journal', 'reports'] },
    { label: 'Grow',         ids: ['trimetrix', 'values', 'goals', 'coach-companion', 'resources'] },
  ];

  function renderAccount() {
    const el = document.getElementById('account');
    const a = (window.Store && Store.account) ? Store.account() : { signedIn: false };
    if (el) {
      el.innerHTML = '';
      if (a.signedIn) {
        const em = document.createElement('div'); em.className = 'acct-email'; em.title = a.email || ''; em.textContent = '👤 ' + (a.email || 'Signed in');
        const out = document.createElement('a'); out.className = 'acct-signout'; out.href = '/.auth/logout'; out.textContent = 'Sign out';
        el.appendChild(em); el.appendChild(out);
      } else {
        const inLink = document.createElement('a'); inLink.className = 'acct-signout'; inLink.href = '/login.html'; inLink.textContent = 'Sign in';
        el.appendChild(inLink);
      }
    }
    // Banner-right account chip (matches the top-right avatar in the reference).
    const br = document.getElementById('bannerRight');
    if (br) {
      const name = a.signedIn ? (a.email || 'Account') : 'Guest';
      const initial = (name[0] || 'G').toUpperCase();
      br.innerHTML = `<span class="banner-user">${esc(name)}</span><span class="banner-avatar" title="${esc(name)}">${esc(initial)}</span>`;
    }
  }

  function applyBrand() {
    const track = Content.track();
    const brand = document.getElementById('brand');
    // Matches the VisionOne Adaptive Course Builder: the color logo lives in the
    // top banner; the sidebar header is a clean centered text title + subtitle.
    brand.innerHTML = `<div class="vo-head">
      <div class="vo-head-title">Coaching Hub</div>
      <div class="vo-head-sub">${track ? esc(track.name) : 'Identity to Impact'}</div>
    </div>`;
    const tn = document.getElementById('trackName'); if (tn) tn.textContent = track ? track.name : '';
    const sel = document.getElementById('trackSelect'); if (sel && track) sel.value = track.id;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  const PILLARS = ['identity', 'mission', 'calling', 'vision', 'launch'];
  function labelFor(id) {
    const meta = TOOL_META[id] || { label: id, icon: '•' };
    // Pillar labels adapt to the active track (e.g. Calling → Mission & Purpose).
    if (PILLARS.includes(id) && window.Content && Content.sectionTitle) return { icon: meta.icon, label: Content.sectionTitle(id) };
    return meta;
  }

  function buildNav() {
    const nav = document.getElementById('nav'); nav.innerHTML = '';
    const groups = NAV_GROUPS.map((g) => ({ label: g.label, ids: g.ids.slice() }));
    const role = (window.Store && Store.role) ? Store.role() : 'coachee';
    if (role === 'admin') groups.push({ label: 'Coach & Admin', ids: ['coach', 'admin'] });
    else if (role === 'coach') groups.push({ label: 'Coach', ids: ['coach'] });
    groups.forEach((g) => {
      const items = g.ids.filter((id) => TOOL_META[id] && window.Tools[id]);
      if (!items.length) return;
      const h = document.createElement('div'); h.className = 'nav-group'; h.textContent = g.label; nav.appendChild(h);
      items.forEach((id) => {
        const meta = labelFor(id);
        const a = document.createElement('a'); a.dataset.tool = id; a.innerHTML = `${meta.icon} &nbsp;${meta.label}`;
        a.onclick = () => { location.hash = id; }; nav.appendChild(a);
      });
    });
  }

  function render() {
    const id = (location.hash.replace('#', '') || 'about');
    const tool = window.Tools[id] || window.Tools['about'];
    document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.tool === id));
    const meta = labelFor(id);
    document.getElementById('viewTitle').textContent = meta.label;
    const track = Content.track();
    document.getElementById('viewTagline').textContent = track ? track.tagline : '';
    const view = document.getElementById('view'); view.innerHTML = '';
    window.scrollTo(0, 0);
    tool.render(view, { go: (t) => { location.hash = t; }, track, rerender: render });
  }

  window.toast = function (msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2600);
  };

  async function boot() {
    await Content.load();
    // Track selector
    const sel = document.getElementById('trackSelect');
    Content.TRACKS.forEach((tr) => { const o = document.createElement('option'); o.value = tr.id; o.textContent = tr.name + ' — ' + tr.audience; sel.appendChild(o); });
    const cur = (window.Store && Store.getTrack) ? Store.getTrack() : 'ministry';
    sel.value = cur;
    if (cur !== 'ministry') { try { await Content.setTrack(cur); } catch { /* fall back to loaded */ } }
    sel.onchange = async () => { await Content.setTrack(sel.value); applyBrand(); toast('Switched to “' + Content.track().name + '”'); render(); };

    applyBrand();

    // Demo "view as" role switcher — lets you preview Coachee / Coach / Admin
    // views locally. In production, the signed-in account's real role wins and
    // this control is hidden.
    const roleWrap = document.getElementById('roleWrap'); const roleSel = document.getElementById('roleSelect');
    if (roleWrap && roleSel) {
      if (window.Store && Store.isServerRole && Store.isServerRole()) { roleWrap.style.display = 'none'; }
      else {
        roleSel.value = (window.Store && Store.role) ? Store.role() : 'coachee';
        roleSel.onchange = () => { Store.setPreviewRole(roleSel.value); buildNav(); toast('Viewing as ' + roleSel.value); render(); };
      }
    }

    buildNav();
    renderAccount();
    render();
    window.addEventListener('hashchange', render);

    if (window.Store && Store.initSync) {
      Store.initSync(() => { renderAccount(); buildNav(); render(); }).then(renderAccount);
    }
    // Optional AI-model (A/B) selector.
    try {
      const wrap = document.getElementById('providerWrap'); const psel = document.getElementById('providerSelect');
      const info = await window.Api.listProviders();
      const ready = (info.providers || []).filter((p) => p.configured);
      if (ready.length > 1) {
        window.AIProviders = ready;
        ready.forEach((p) => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.label; psel.appendChild(o); });
        psel.value = info.default || ready[0].id; window.Api.setProvider(psel.value);
        psel.onchange = () => window.Api.setProvider(psel.value);
        wrap.style.display = '';
      }
    } catch { /* providers endpoint optional */ }
  }

  window.Tools = window.Tools || {};
  document.addEventListener('DOMContentLoaded', boot);
})();
