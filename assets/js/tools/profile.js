// Profile — the "about you" hub, shown before Start Here. Captures name + track
// + demographic info that personalizes the whole experience, and lets the coachee
// identify a coach and choose how much of their information to share.
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const DEMOS = {
    all: [
      { id: 'ageRange', label: 'Age range', type: 'select', options: ['18–24', '25–34', '35–44', '45–54', '55–64', '65+'] },
      { id: 'lifeStage', label: 'Life stage', type: 'select', options: ['Single', 'Married', 'Raising young kids', 'Kids launching', 'Empty nester', 'Caregiver', 'Prefer not to say'] },
      { id: 'timeline', label: 'How soon is this transition?', type: 'select', options: ['Happening now', 'Within 6 months', '6–12 months', '1–2 years', 'Just exploring'] },
      { id: 'education', label: 'Highest education', type: 'select', options: ['High school', 'Some college', 'Associate', 'Bachelor’s', 'Master’s', 'Doctorate', 'Trade / certification'] },
    ],
    ministry: [
      { id: 'faithStage', label: 'Where are you in your faith journey?', type: 'select', options: ['New / exploring', 'Growing', 'Established', 'Leader / minister', 'In a hard season'] },
      { id: 'ministryRole', label: 'Ministry / church context (optional)', type: 'text', placeholder: 'e.g. Small-group leader, lay minister, none yet' },
    ],
    military: [
      { id: 'branch', label: 'Branch / service', type: 'select', options: ['Army', 'Navy', 'Air Force', 'Marines', 'Coast Guard', 'Space Force', 'National Guard / Reserve', 'First responder (Fire/EMS/Police)'] },
      { id: 'years', label: 'Years of service', type: 'select', options: ['<4', '4–8', '9–12', '13–20', '20+'] },
      { id: 'rank', label: 'Rank / pay grade (optional)', type: 'text', placeholder: 'e.g. E-6, O-3' },
      { id: 'mos', label: 'MOS / specialty (optional)', type: 'text', placeholder: 'e.g. 68W Combat Medic' },
      { id: 'sepStatus', label: 'Separation status', type: 'select', options: ['Still serving', 'Separating soon', 'Recently separated', 'Retired'] },
    ],
    business: [
      { id: 'roleLevel', label: 'Current role level', type: 'select', options: ['Individual contributor', 'New manager', 'Manager', 'Director', 'VP', 'C-suite / Owner'] },
      { id: 'industry', label: 'Industry', type: 'text', placeholder: 'e.g. Manufacturing, Healthcare, SaaS' },
      { id: 'teamSize', label: 'Team size you lead', type: 'select', options: ['None yet', '1–5', '6–15', '16–50', '50+'] },
      { id: 'yearsLeading', label: 'Years in leadership', type: 'select', options: ['<1', '1–3', '4–7', '8–15', '15+'] },
    ],
    career: [
      { id: 'searchStage', label: 'Where are you in your search?', type: 'select', options: ['Just deciding to change', 'Exploring options', 'Actively applying', 'Interviewing', 'Weighing an offer', 'Recently laid off', 'Re-entering the workforce'] },
      { id: 'currentField', label: 'Current / most recent field', type: 'text', placeholder: 'e.g. Operations, Nursing, Sales' },
      { id: 'targetField', label: 'Field or role you\'re targeting (if known)', type: 'text', placeholder: 'e.g. Project management' },
      { id: 'experience', label: 'Years of work experience', type: 'select', options: ['<2', '2–5', '6–10', '11–20', '20+'] },
    ],
  };

  // VisionOne coach directory (michelle is real; others are examples for now).
  const COACHES = [
    { email: 'michelle@visiononeperformance.com', name: 'Michelle Larson', title: 'Founder & Master Coach · TriMetrix HD Certified', focus: 'Identity, calling, and leadership transformation' },
    { email: 'david@visiononeperformance.com', name: 'David Chen', title: 'Transition & Career Coach · TriMetrix HD Certified', focus: 'Career changes and service-member transitions' },
    { email: 'sarah@visiononeperformance.com', name: 'Sarah Bennett', title: 'Faith & Life Coach · TriMetrix HD Certified', focus: 'Ministry, identity, and vision journeys' },
  ];

  const SCOPES = [
    { id: 'journey', label: 'My journey answers (Identity, Mission, Calling, Vision, Launch)' },
    { id: 'assessment', label: 'My TriMetrix HD assessment & debrief' },
    { id: 'reports', label: 'My generated reports & summaries' },
    { id: 'goals', label: 'My goals & plans' },
    { id: 'journal', label: 'My private journal entries (thanksgiving, prayers, dreams…)' },
  ];

  function render(container, ctx) {
    const p = Store.getProfile();
    const demo = p.demographics || {};

    // Basics
    const basics = document.createElement('div'); basics.className = 'card';
    basics.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">Your profile</h3><p class="muted" style="margin:0 0 14px">A little about you personalizes the language, examples, and coaching throughout the journey. This is private unless you choose to share it with a coach.</p>`;
    basics.appendChild(field('Your name', () => { const i = document.createElement('input'); i.className = 'input'; i.value = p.name || ''; i.placeholder = 'First name'; i.addEventListener('input', () => Store.setProfile({ name: i.value })); return i; }));

    // Path picker
    const tf = document.createElement('div'); tf.className = 'step';
    tf.innerHTML = `<div class="step-label">Your path</div><div class="step-prompt">The core journey stays the same — language, examples, and resources adapt to your purpose.</div>`;
    const cards = document.createElement('div'); cards.className = 'journey-grid';
    Content.TRACKS.forEach((tr) => {
      const c = document.createElement('div'); c.className = 'journey-card'; c.style.outline = (Store.getTrack() === tr.id) ? '2px solid var(--primary)' : 'none';
      c.innerHTML = `<h4>${esc(tr.name)}</h4><div class="jc-statement">${esc(tr.audience)}</div>`;
      c.onclick = async () => { await Content.setTrack(tr.id); const sel = document.getElementById('trackSelect'); if (sel) sel.value = tr.id; toast('Path set: ' + tr.name); render(container, ctx); };
      cards.appendChild(c);
    });
    tf.appendChild(cards); basics.appendChild(tf);
    container.appendChild(basics);

    // Demographics
    const dcard = document.createElement('div'); dcard.className = 'card';
    dcard.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 4px">A little about you</h3><p class="muted small" style="margin:0 0 12px">Optional — it helps examples and coaching fit your life.</p>`;
    const grid = document.createElement('div'); grid.className = 'grid2';
    DEMOS.all.concat(DEMOS[Store.getTrack()] || []).forEach((q) => grid.appendChild(demoField(q, demo)));
    dcard.appendChild(grid);
    dcard.appendChild(field('What season or transition are you in?', () => { const ta = document.createElement('textarea'); ta.className = 'input'; ta.rows = 3; ta.value = p.transitionContext || ''; ta.placeholder = 'e.g. Separating from the Army after 12 years…'; ta.addEventListener('input', () => Store.setProfile({ transitionContext: ta.value })); if (window.UI && UI.addInputTools) UI.addInputTools(ta, { upload: false, mic: true }); return ta; }));
    dcard.appendChild(field('How ready do you feel to grow right now?', () => { const sel = document.createElement('select'); sel.className = 'input'; ['Wide open — let\'s go', 'Curious but cautious', 'Skeptical but willing', 'Feeling stuck'].forEach((o) => { const op = document.createElement('option'); op.textContent = o; sel.appendChild(op); }); sel.value = p.readiness || 'Curious but cautious'; sel.onchange = () => Store.setProfile({ readiness: sel.value }); return sel; }));
    container.appendChild(dcard);

    // Goals & Desired Outcomes
    const gcard = document.createElement('div'); gcard.className = 'card';
    gcard.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 4px">Your goals for this journey</h3><p class="muted small" style="margin:0 0 12px">What do you want to discover, clarify, or achieve by the end? This helps personalize your experience.</p>`;
    gcard.appendChild(field('What are your top 1–3 desired outcomes?', () => { const ta = document.createElement('textarea'); ta.className = 'input'; ta.rows = 3; ta.value = p.desiredOutcomes || ''; ta.placeholder = 'e.g. Clarity on my next role… A stronger sense of calling… Better work-life balance… Understanding my strengths'; ta.addEventListener('input', () => Store.setProfile({ desiredOutcomes: ta.value })); if (window.UI && UI.addInputTools) UI.addInputTools(ta, { upload: false, mic: true }); return ta; }));
    gcard.appendChild(field('What would success look like for you?', () => { const ta = document.createElement('textarea'); ta.className = 'input'; ta.rows = 2; ta.value = p.successDefinition || ''; ta.placeholder = 'e.g. I\'d feel confident in my identity… I\'d have a clear vision… I\'d know my next steps'; ta.addEventListener('input', () => Store.setProfile({ successDefinition: ta.value })); if (window.UI && UI.addInputTools) UI.addInputTools(ta, { upload: false, mic: true }); return ta; }));
    gcard.appendChild(field('What's one question you most want answered?', () => { const ta = document.createElement('textarea'); ta.className = 'input'; ta.rows = 2; ta.value = p.keyQuestion || ''; ta.placeholder = 'e.g. What am I meant to do next?… Who am I becoming?… How do I know if this is the right move?'; ta.addEventListener('input', () => Store.setProfile({ keyQuestion: ta.value })); if (window.UI && UI.addInputTools) UI.addInputTools(ta, { upload: false, mic: true }); return ta; }));
    container.appendChild(gcard);

    // Coach access (identify coach + choose what to share)
    container.appendChild(coachAccessCard(container, ctx));

    const foot = document.createElement('div'); foot.className = 'card';
    const row = document.createElement('div'); row.className = 'btn-row';
    const go = document.createElement('button'); go.className = 'btn'; go.textContent = 'Continue to Start Here →'; go.onclick = () => ctx.go('guided');
    row.appendChild(go); foot.appendChild(row); container.appendChild(foot);
  }

  function coachAccessCard(container, ctx) {
    const sharing = Store.getSharing();
    const scopes = sharing.scopes || { journey: true, assessment: true, reports: true, goals: true, journal: false };
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">👥 Work with a coach</h3><p class="muted" style="margin:0 0 12px">Choose your coach and decide how much to share. Your journey is private until you turn sharing on, and you can revoke it anytime.</p>`;

    // Two kinds of coaching — roles + when to use each.
    const roles = document.createElement('div'); roles.className = 'card soft';
    roles.innerHTML = `<div class="ai-assist-label">Two kinds of coaching in this app</div>
      <div class="grid2">
        <div><b>💬 AI Coach Companion</b><p class="small muted" style="margin:4px 0 0">Always on, instant, judgment-free. Great for clarifying a prompt, brainstorming, getting examples, staying on track, and general encouragement between sessions. It coaches at a general level and hands you off when deeper work is needed.</p></div>
        <div><b>🧑‍🏫 Live VisionOne Coach</b><p class="small muted" style="margin:4px 0 0">A real, TriMetrix HD–certified human. Best for a full assessment debrief, deep mindset/identity work, big or emotional decisions, accountability, and personalized guidance. Choose one below and share what you're comfortable with.</p></div>
      </div>`;
    card.appendChild(roles);

    // Coach picker
    let selectedEmail = sharing.coachEmail || '';
    const pickStep = document.createElement('div'); pickStep.className = 'step';
    pickStep.innerHTML = `<div class="step-label">Who is your coach? (optional)</div><div class="step-prompt">Select a VisionOne coach — or choose "Someone else" to enter their email.</div>`;
    const pickWrap = document.createElement('div');
    function drawPick() {
      pickWrap.innerHTML = '';
      const opts = [{ email: '', name: 'No coach yet', title: 'Just me and the AI Coach for now', focus: '' }].concat(COACHES);
      opts.forEach((co) => {
        const row = document.createElement('label'); row.className = 'coach-option' + (selectedEmail === co.email ? ' selected' : '');
        const rb = document.createElement('input'); rb.type = 'radio'; rb.name = 'coachPick'; rb.checked = selectedEmail === co.email;
        rb.onchange = () => { selectedEmail = co.email; persist(); drawPick(); };
        const body = document.createElement('div'); body.style.flex = '1';
        body.innerHTML = `<b>${esc(co.name)}</b>${co.title ? ` <span class="muted small">— ${esc(co.title)}</span>` : ''}${co.focus ? `<div class="muted small">${esc(co.focus)}</div>` : ''}${co.email ? `<div class="muted small">${esc(co.email)}</div>` : ''}`;
        row.appendChild(rb); row.appendChild(body); pickWrap.appendChild(row);
      });
      // "Someone else"
      const isOther = selectedEmail && !COACHES.some((c) => c.email === selectedEmail);
      const otherRow = document.createElement('label'); otherRow.className = 'coach-option' + (isOther ? ' selected' : '');
      const orb = document.createElement('input'); orb.type = 'radio'; orb.name = 'coachPick'; orb.checked = isOther;
      orb.onchange = () => { selectedEmail = isOther ? selectedEmail : ' '; persist(); drawPick(); setTimeout(() => { const i = pickWrap.querySelector('#otherEmail'); if (i) i.focus(); }, 0); };
      const ob = document.createElement('div'); ob.style.flex = '1'; ob.innerHTML = `<b>Someone else</b>`;
      const oi = document.createElement('input'); oi.id = 'otherEmail'; oi.className = 'input'; oi.type = 'email'; oi.placeholder = 'coach@example.com'; oi.style.marginTop = '6px'; oi.value = isOther ? selectedEmail.trim() : '';
      oi.style.display = (isOther || orb.checked) ? 'block' : 'none';
      oi.addEventListener('input', () => { selectedEmail = oi.value; persist(); });
      ob.appendChild(oi); otherRow.appendChild(orb); otherRow.appendChild(ob); pickWrap.appendChild(otherRow);
    }
    drawPick();
    pickStep.appendChild(pickWrap); card.appendChild(pickStep);
    const email = { get value() { return (selectedEmail || '').trim(); } }; // shim for the share button below

    // Scope checkboxes
    const scopeStep = document.createElement('div'); scopeStep.className = 'step';
    scopeStep.innerHTML = `<div class="step-label">What can your coach see?</div><div class="step-prompt">Pick some or all. (Journal entries are the most personal — off by default.)</div>`;
    const boxes = {};
    SCOPES.forEach((s) => {
      const l = document.createElement('label'); l.className = 'chk'; l.style.display = 'flex'; l.style.margin = '6px 0';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!scopes[s.id]; boxes[s.id] = cb;
      cb.onchange = () => persist();
      l.appendChild(cb); l.appendChild(document.createTextNode(' ' + s.label)); scopeStep.appendChild(l);
    });
    card.appendChild(scopeStep);

    function currentScopes() { const o = {}; SCOPES.forEach((s) => { o[s.id] = boxes[s.id].checked; }); return o; }
    function persist() { Store.setSharing({ coachEmail: email.value.trim(), scopes: currentScopes() }); }

    const row = document.createElement('div'); row.className = 'btn-row';
    if (!sharing.consent) {
      const share = document.createElement('button'); share.className = 'btn'; share.textContent = 'Share with this coach';
      share.onclick = () => { if (!email.value.trim()) { toast('Enter your coach\'s email first'); return; } Store.setSharing({ consent: true, coachEmail: email.value.trim(), scopes: currentScopes() }); toast('Sharing enabled'); render(container, ctx); };
      row.appendChild(share);
    } else {
      const badge = document.createElement('span'); badge.className = 'badge ok'; badge.style.alignSelf = 'center'; badge.textContent = 'Sharing with ' + esc(sharing.coachEmail);
      const revoke = document.createElement('button'); revoke.className = 'btn danger'; revoke.textContent = 'Stop sharing'; revoke.onclick = () => { Store.setSharing({ consent: false }); toast('Sharing revoked'); render(container, ctx); };
      row.appendChild(badge); row.appendChild(revoke);
    }
    card.appendChild(row);
    return card;
  }

  function demoField(q, demo) {
    const f = document.createElement('div'); f.className = 'demo-field';
    f.innerHTML = `<label class="small muted">${esc(q.label)}</label>`;
    let input;
    if (q.type === 'select') { input = document.createElement('select'); input.className = 'input'; const b = document.createElement('option'); b.value = ''; b.textContent = '—'; input.appendChild(b); q.options.forEach((o) => { const op = document.createElement('option'); op.value = o; op.textContent = o; input.appendChild(op); }); }
    else { input = document.createElement('input'); input.className = 'input'; input.type = 'text'; if (q.placeholder) input.placeholder = q.placeholder; }
    input.value = demo[q.id] || '';
    const set = () => { const d = Store.getProfile().demographics || {}; d[q.id] = input.value; Store.setProfile({ demographics: d }); };
    input.addEventListener('input', set); input.addEventListener('change', set);
    f.appendChild(input); return f;
  }
  function field(label, makeInput, hint) { const d = document.createElement('div'); d.className = 'step'; d.innerHTML = `<div class="step-label">${esc(label)}</div>` + (hint ? `<div class="step-prompt">${esc(hint)}</div>` : ''); d.appendChild(makeInput()); return d; }

  window.Tools = window.Tools || {};
  window.Tools['profile'] = { render };
})();
