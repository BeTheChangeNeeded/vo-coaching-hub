// Coach Dashboard — two-sided.
//  • Coachee view: sharing status (managed in Profile), requests, and the notes
//    and session logs their coach has left.
//  • Coach view (isCoach/admin): list consented coachees; open a rich client view
//    to see everything they've shared (journey, reports, goals, journal), log
//    coaching calls (notes or full transcripts), leave notes/assignments, and
//    email to schedule.
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const md = (s) => window.marked ? marked.parse(s || '') : esc(s);
  const fmt = (iso) => { try { return new Date(iso).toLocaleString(); } catch { return iso; } };
  const day = (iso) => { try { return new Date(iso).toLocaleDateString(); } catch { return iso; } };

  function render(container, ctx) {
    if (Store.isCoach && Store.isCoach()) renderCoachView(container, ctx);
    renderCoacheeView(container, ctx);
  }

  // ----- Coachee side -----
  function renderCoacheeView(container, ctx) {
    const sharing = Store.getSharing();
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">👥 Work with a coach</h3>`;
    if (sharing.consent) {
      const scopes = sharing.scopes || {}; const on = Object.keys(scopes).filter((k) => scopes[k]);
      card.innerHTML += `<p class="muted" style="margin:0 0 10px"><span class="badge ok">Sharing with ${esc(sharing.coachEmail)}</span> &nbsp; ${on.length ? esc(on.join(', ')) : 'all sections'}</p>`;
    } else {
      card.innerHTML += `<p class="muted" style="margin:0 0 10px">Your journey is private. Identify a coach and choose what to share in your <b>Profile</b>.</p>`;
    }
    const mgr = document.createElement('button'); mgr.className = 'btn ghost'; mgr.textContent = 'Manage coach & sharing in Profile →'; mgr.onclick = () => ctx.go('profile');
    card.appendChild(mgr); container.appendChild(card);

    // Requests
    const reqCard = document.createElement('div'); reqCard.className = 'card';
    reqCard.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">Requests</h3><p class="muted" style="margin:0 0 10px">Ask your coach for a debrief, a fresh assessment, or a session.</p>`;
    const rr = document.createElement('div'); rr.className = 'btn-row';
    [['debrief', '🗣️ Request a debrief session'], ['assessment', '📋 Request a new assessment'], ['session', '☕ Request a coaching session']].forEach(([type, label]) => {
      const b = document.createElement('button'); b.className = 'btn ghost'; b.textContent = label; b.onclick = () => makeRequest(type); rr.appendChild(b);
    });
    reqCard.appendChild(rr);
    const reqs = Store.getRequests();
    reqs.slice(0, 8).forEach((r) => { const row = document.createElement('div'); row.className = 'list-note'; row.innerHTML = `<div style="flex:1"><b>${esc(labelFor(r.type))}</b> <span class="when">${fmt(r.createdAt)}</span></div><span class="badge ${r.status === 'requested' ? 'wait' : 'ok'}">${esc(r.status)}</span>`; reqCard.appendChild(row); });
    container.appendChild(reqCard);

    // Notes from coach
    const notes = Store.getCoachingNotes();
    const nc = document.createElement('div'); nc.className = 'card';
    nc.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 10px">Notes from your coach</h3>`;
    if (!notes.length) nc.innerHTML += '<div class="empty">No notes yet. Encouragement and next steps from your coach will appear here.</div>';
    notes.forEach((n) => { const row = document.createElement('div'); row.className = 'list-note'; row.innerHTML = `<div style="flex:1"><div class="md">${md(n.note)}</div><div class="when">${esc(n.authorEmail || 'Coach')} · ${fmt(n.at)}</div></div>`; nc.appendChild(row); });
    container.appendChild(nc);

    // Coaching sessions log (coachee can see records of their calls)
    const sessions = Store.getCoachingSessions();
    if (sessions.length) {
      const sc = document.createElement('div'); sc.className = 'card';
      sc.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 10px">Your coaching sessions</h3>`;
      sessions.forEach((s) => {
        const row = document.createElement('div'); row.className = 'list-note';
        row.innerHTML = `<div style="flex:1"><b>Session — ${esc(day(s.sessionDate))}</b><div class="md">${md((s.summary || '').slice(0, 400))}</div><div class="when">${esc(s.authorEmail || 'Coach')}</div></div>`;
        if (s.transcript) { const v = document.createElement('button'); v.className = 'btn ghost small'; v.textContent = 'Transcript'; v.onclick = () => UI.modal('Session transcript — ' + day(s.sessionDate), `<div class="md">${md(s.transcript)}</div>`); row.appendChild(v); }
        sc.appendChild(row);
      });
      container.appendChild(sc);
    }

    async function makeRequest(type) {
      Store.addRequest(type, labelFor(type));
      try { await Api.submitRequest({ type, note: labelFor(type), coachEmail: Store.getSharing().coachEmail, profile: { name: Store.getProfile().name } }); } catch (e) { /* stored locally */ }
      toast('Request sent'); render(container, ctx);
    }
  }
  function labelFor(t) { return t === 'assessment' ? 'New assessment' : t === 'debrief' ? 'TriMetrix debrief' : 'Coaching session'; }

  // ----- Coach side -----
  function renderCoachView(container, ctx) {
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 10px">🧑‍🏫 Your coachees</h3><div id="clientList"><p class="muted">Loading…</p></div>`;
    container.appendChild(card);
    Api.coachClients().then(({ clients }) => {
      const el = card.querySelector('#clientList');
      if (!clients || !clients.length) { el.innerHTML = '<div class="empty">No coachees have shared their journey with you yet.</div>'; return; }
      el.innerHTML = '';
      clients.forEach((c) => {
        const row = document.createElement('div'); row.className = 'list-note';
        row.innerHTML = `<div style="flex:1"><b>${esc(c.name || c.email)}</b><div class="when">${esc(c.email || '')} · shared ${day(c.sharedAt)}</div></div>`;
        const open = document.createElement('button'); open.className = 'btn ghost small'; open.textContent = 'Open'; open.onclick = () => openClient(c);
        row.appendChild(open); el.appendChild(row);
      });
    }).catch((e) => { card.querySelector('#clientList').innerHTML = `<div class="error small">${esc(e.message || 'Could not load coachees (backend not configured).')}</div>`; });
  }

  async function openClient(c) {
    UI.modal(esc(c.name || c.email), '<p class="muted">Loading journey…</p>');
    const body = document.querySelector('.modal-body');
    let data;
    try { data = await Api.coachClient(c.userId); }
    catch (e) { body.innerHTML = `<div class="error">${esc(e.message)}</div>`; return; }
    const ws = data.workspace || {}; const scopes = data.scopes || {};
    const tabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'journey', label: 'Journey', on: scopes.journey },
      { id: 'reports', label: 'Reports', on: scopes.reports },
      { id: 'goals', label: 'Goals', on: scopes.goals },
      { id: 'journal', label: 'Journal', on: scopes.journal },
      { id: 'sessions', label: 'Sessions & Notes', always: true },
    ].filter((t) => t.always || t.on || t.id === 'overview');

    body.innerHTML = `<div class="tabbar" id="ccTabs"></div><div id="ccPanel"></div>`;
    const tabbar = body.querySelector('#ccTabs'); const panel = body.querySelector('#ccPanel');
    let active = 'overview';
    function drawTabs() { tabbar.innerHTML = ''; tabs.forEach((t) => { const b = document.createElement('button'); b.textContent = t.label; b.classList.toggle('active', t.id === active); b.onclick = () => { active = t.id; drawTabs(); drawPanel(); }; tabbar.appendChild(b); }); }
    function drawPanel() {
      if (active === 'overview') return drawOverview();
      if (active === 'journey') return drawJourney();
      if (active === 'reports') return drawReports();
      if (active === 'goals') return drawGoals();
      if (active === 'journal') return drawJournal();
      if (active === 'sessions') return drawSessions();
    }
    drawTabs(); drawPanel();

    function drawOverview() {
      const p = ws.profile || {}; const d = p.demographics || {};
      const demo = Object.keys(d).filter((k) => d[k]).map((k) => `${k}: ${esc(d[k])}`).join(' · ');
      const sharedList = Object.keys(scopes).filter((k) => scopes[k]).join(', ') || 'none';
      panel.innerHTML = `<div class="md">
        <p><b>Name:</b> ${esc(p.name || c.name || '—')} &nbsp; <b>Path:</b> ${esc(p.track || '—')}</p>
        <p><b>Season/transition:</b> ${esc(p.transitionContext || '—')}</p>
        ${demo ? `<p><b>About:</b> ${demo}</p>` : ''}
        <p><b>Sharing:</b> ${esc(sharedList)} &nbsp; <b>Assessment:</b> ${ws.assessment ? 'uploaded' : 'not uploaded'} &nbsp; <b>Reports:</b> ${(ws.reports || []).length} &nbsp; <b>Plans:</b> ${(ws.goalPlans || []).length}</p>
      </div>`;
      const row = document.createElement('div'); row.className = 'btn-row';
      if (c.email) { const sched = document.createElement('button'); sched.className = 'btn ghost'; sched.textContent = '📅 Email to schedule'; sched.onclick = () => { const subj = encodeURIComponent('Scheduling our coaching session'); const bd = encodeURIComponent(`Hi ${p.name || ''},\n\nI'd love to set up a time to connect. Here are a few options:\n- \n- \n\nWhat works best for you?\n\n`); window.location.href = `mailto:${c.email}?subject=${subj}&body=${bd}`; }; row.appendChild(sched); }
      panel.appendChild(row);
    }
    function drawJourney() {
      const j = ws.journey || {}; const parts = [];
      Content.sections().forEach((s) => {
        const block = [];
        (s.exercises || []).forEach((ex) => {
          const ans = j[ex.id]; if (!ans) return;
          (ex.steps || []).forEach((st) => {
            const v = ans[st.id]; if (!v) return;
            const val = Array.isArray(v) ? v.map((x) => typeof x === 'object' ? JSON.stringify(x) : x).filter(Boolean).join('; ') : (typeof v === 'object' ? JSON.stringify(v) : v);
            if (val && String(val).trim()) block.push(`<p><b>${esc(ex.title)} — ${esc(st.label)}:</b> ${esc(String(val))}</p>`);
          });
        });
        if (block.length) parts.push(`<h4>${esc(s.title)}</h4>${block.join('')}`);
      });
      panel.innerHTML = parts.length ? `<div class="md">${parts.join('')}</div>` : '<div class="empty">No journey entries yet.</div>';
    }
    function drawReports() {
      const reports = ws.reports || [];
      if (!reports.length) { panel.innerHTML = '<div class="empty">No reports generated yet.</div>'; return; }
      panel.innerHTML = '';
      reports.forEach((r) => { const row = document.createElement('div'); row.className = 'list-note'; row.innerHTML = `<div style="flex:1"><b>${esc(r.title || 'Report')}</b><div class="when">${fmt(r.createdAt)}</div></div>`; const v = document.createElement('button'); v.className = 'btn ghost small'; v.textContent = 'View'; v.onclick = () => UI.modal(esc(r.title || 'Report'), `<div class="md">${md(r.markdown || '')}</div>`); row.appendChild(v); panel.appendChild(row); });
    }
    function drawGoals() {
      const plans = ws.goalPlans || [];
      if (!plans.length) { panel.innerHTML = '<div class="empty">No plans yet.</div>'; return; }
      panel.innerHTML = '';
      plans.forEach((pl) => {
        const cur = (pl.versions && pl.versions[0] && pl.versions[0].data) || {};
        const goals = Array.isArray(cur.goals) ? cur.goals.filter(Boolean) : [];
        const wrap = document.createElement('div'); wrap.className = 'card soft';
        wrap.innerHTML = `<b>${esc(pl.title)}</b> <span class="badge">${(pl.versions || []).length} version(s)</span>` +
          (cur.vision ? `<p class="small"><b>Vision:</b> ${esc(cur.vision)}</p>` : '') +
          (goals.length ? `<p class="small"><b>Goals:</b></p><ul class="md">${goals.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>` : '<p class="muted small">No goals captured yet.</p>') +
          (cur.metrics ? `<p class="small"><b>Progress measures:</b> ${esc(cur.metrics)}</p>` : '');
        panel.appendChild(wrap);
      });
    }
    function drawJournal() {
      const t = ws.tabs || {}; const keys = Object.keys(t).filter((k) => (t[k] || []).length);
      if (!keys.length) { panel.innerHTML = '<div class="empty">No journal entries shared.</div>'; return; }
      panel.innerHTML = keys.map((k) => `<h4 style="text-transform:capitalize">${esc(k)}</h4>` + (t[k] || []).map((e) => `<div class="list-note"><div class="md">${md(e.text)}</div></div>`).join('')).join('');
    }
    function drawSessions() {
      panel.innerHTML = '';
      // Log a session
      const logCard = document.createElement('div'); logCard.className = 'card soft';
      logCard.innerHTML = `<div class="ai-assist-label">Log a coaching call / meeting</div>
        <label class="small muted">Date</label><input type="date" class="input" id="sDate">
        <label class="small muted">Summary / notes</label><textarea class="input" id="sSummary" rows="3" placeholder="What you covered, decisions, next steps…"></textarea>
        <label class="small muted">Transcript (optional — paste or upload)</label><textarea class="input" id="sTranscript" rows="3" placeholder="Paste a transcript, or use Upload."></textarea>`;
      const sBtn = document.createElement('button'); sBtn.className = 'btn'; sBtn.textContent = 'Save session'; sBtn.style.marginTop = '10px';
      logCard.appendChild(sBtn);
      panel.appendChild(logCard);
      const trEl = logCard.querySelector('#sTranscript'); if (window.UI && UI.addInputTools) UI.addInputTools(trEl, { upload: true, mic: true });
      sBtn.onclick = async () => {
        const summary = logCard.querySelector('#sSummary').value.trim(); const transcript = trEl.value.trim(); const sessionDate = logCard.querySelector('#sDate').value;
        if (!summary && !transcript) { toast('Add a summary or transcript'); return; }
        sBtn.disabled = true;
        try { await Api.coachSession({ userId: c.userId, summary, transcript, sessionDate: sessionDate ? new Date(sessionDate).toISOString() : undefined }); toast('Session saved'); ws.coachingSessions = [{ summary, transcript, sessionDate, authorEmail: 'you', at: new Date().toISOString() }].concat(ws.coachingSessions || []); drawSessions(); }
        catch (e) { toast(e.message || 'Save failed'); sBtn.disabled = false; }
      };

      // Leave a note
      const noteCard = document.createElement('div'); noteCard.className = 'card soft';
      noteCard.innerHTML = `<div class="ai-assist-label">Leave a note / assignment (visible to your coachee)</div><textarea class="input" id="noteBox" rows="3" placeholder="Encouragement, an observation, or a next step…"></textarea>`;
      const nBtn = document.createElement('button'); nBtn.className = 'btn'; nBtn.textContent = 'Send note'; nBtn.style.marginTop = '10px'; noteCard.appendChild(nBtn);
      panel.appendChild(noteCard);
      nBtn.onclick = async () => { const note = noteCard.querySelector('#noteBox').value.trim(); if (!note) return; nBtn.disabled = true; try { await Api.coachNote({ userId: c.userId, note }); toast('Note sent'); ws.coachingNotes = [{ note, authorEmail: 'you', at: new Date().toISOString() }].concat(ws.coachingNotes || []); drawSessions(); } catch (e) { toast(e.message || 'Failed'); nBtn.disabled = false; } };

      // History
      const sessions = ws.coachingSessions || []; const notes = ws.coachingNotes || [];
      if (sessions.length) { panel.insertAdjacentHTML('beforeend', '<h4 style="margin:14px 0 6px">Session history</h4>'); sessions.forEach((s) => { const row = document.createElement('div'); row.className = 'list-note'; row.innerHTML = `<div style="flex:1"><b>${esc(day(s.sessionDate))}</b><div class="md">${md((s.summary || '').slice(0, 300))}</div></div>`; if (s.transcript) { const v = document.createElement('button'); v.className = 'btn ghost small'; v.textContent = 'Transcript'; v.onclick = () => UI.modal('Transcript', `<div class="md">${md(s.transcript)}</div>`); row.appendChild(v); } panel.appendChild(row); }); }
      if (notes.length) { panel.insertAdjacentHTML('beforeend', '<h4 style="margin:14px 0 6px">Notes</h4>'); notes.forEach((n) => { panel.insertAdjacentHTML('beforeend', `<div class="list-note"><div style="flex:1"><div class="md">${md(n.note)}</div><div class="when">${fmt(n.at)}</div></div></div>`); }); }
    }
  }

  window.Tools = window.Tools || {};
  window.Tools['coach'] = { render };
})();
