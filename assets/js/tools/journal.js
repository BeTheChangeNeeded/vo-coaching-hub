// Journal — the reflective "tabs" (notes, weekly check-in, thanksgiving, Bible
// reflection, prayers & praise, dreams & art, prophetic words, declarations,
// themes & gold). Faith-only tabs are hidden automatically for secular tracks.
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (iso) => { try { return new Date(iso).toLocaleString(); } catch { return iso; } };
  const mkBtn = (t) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost small'; b.textContent = t; return b; };

  function render(container, ctx) {
    const tabs = Content.tabs();
    let active = Store.getSetting('journalTab');
    if (!tabs.some((t) => t.id === active)) active = tabs[0] && tabs[0].id;

    container.innerHTML = '';

    // Journal introduction — shown above the tabs (collapsible; remembers state).
    const introCollapsed = Store.getSetting('journalIntroCollapsed');
    const intro = document.createElement('div'); intro.className = 'card';
    if (introCollapsed) {
      intro.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--wt-font-head)">📓 About your Journal</b><button class="btn ghost xsmall" id="jIntroToggle">Show</button></div>`;
    } else {
      intro.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h3 style="font-family:var(--wt-font-head);margin:0">📓 About your Journal</h3><button class="btn ghost xsmall" id="jIntroToggle">Hide</button></div>
        <div class="md" style="margin-top:8px">
          <p>The Journal is a <b>supplemental space</b> alongside your main journey — a place to reflect, capture insights, and track your progress. The pillars help you <i>build</i>; the journal helps you <i>notice</i>. Over time, the threads you capture here become the “gold” that reveals who you are and what you're called to.</p>
          <p><b>Why it matters:</b></p>
          <ul>
            <li><b>Reflection turns experience into insight.</b> Writing consolidates learning and helps you see what you'd otherwise miss.</li>
            <li><b>Patterns emerge over time.</b> A prayer, a dream, a moment of gratitude — captured repeatedly — points to your calling.</li>
            <li><b>Small practices rewire the brain.</b> As little as 4–7 minutes of reflection a day begins to form new thinking; gratitude and declarations strengthen it.</li>
            <li><b>Tracking sustains momentum.</b> The weekly check-in keeps you honest about what's working and what to focus on next.</li>
          </ul>
          <p><b>How to use it without getting overwhelmed:</b></p>
          <ul>
            <li><b>You don't need every tab.</b> Pick one or two that fit your season — treat this like a toolbox, not a checklist.</li>
            <li><b>A few minutes counts.</b> One line of gratitude or a single insight is enough.</li>
            <li><b>Capture, don't perfect.</b> Use the 🎤 dictate button and just talk it out.</li>
            <li><b>Come back when something surfaces</b> — a dream, a verse, a word someone spoke over you.</li>
            <li><b>Let it build.</b> When you're ready, the <b>Themes & Gold</b> tab pulls the threads together into a summary.</li>
          </ul>
        </div>`;
    }
    container.appendChild(intro);
    intro.querySelector('#jIntroToggle').onclick = () => { Store.setSetting('journalIntroCollapsed', !introCollapsed); render(container, ctx); };

    const bar = document.createElement('div'); bar.className = 'tabbar';
    tabs.forEach((t) => {
      const b = document.createElement('button'); b.textContent = `${t.icon} ${t.title}`; b.classList.toggle('active', t.id === active);
      b.onclick = () => { Store.setSetting('journalTab', t.id); render(container, ctx); };
      bar.appendChild(b);
    });
    container.appendChild(bar);

    const tab = tabs.find((t) => t.id === active); if (!tab) return;
    const panel = document.createElement('div'); panel.className = 'card';
    panel.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">${tab.icon} ${esc(tab.title)}</h3><p class="muted" style="margin:0 0 8px">${esc(tab.prompt)}</p>`;
    // Help for each journal section: What is this? / Examples / Resources
    const help = document.createElement('div'); help.className = 'help-row';
    const bWhat = mkBtn('❓ What is this?'); const bEx = mkBtn('💡 Examples'); const bRes = mkBtn('📚 Resources on this');
    help.appendChild(bWhat); help.appendChild(bEx); help.appendChild(bRes);
    const hOut = document.createElement('div'); hOut.className = 'help-out';
    panel.appendChild(help); panel.appendChild(hOut);
    container.appendChild(panel);

    const askExplain = async (which) => {
      hOut.innerHTML = '<p class="muted small">Thinking…</p>';
      try {
        const track = Content.track();
        const r = await Api.explain({ exerciseTitle: tab.title + ' (journal)', purpose: tab.prompt, stepPrompt: tab.prompt, trackId: track.id, coachInstructions: track.coachInstructions, demographics: Store.demographicsSummary() });
        if (which === 'examples') hOut.innerHTML = `<div class="card soft"><div class="ai-assist-label">💡 Examples</div><ul class="md">${(r.examples || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
        else hOut.innerHTML = `<div class="card soft"><div class="ai-assist-label">❓ What this is & why it matters</div><div class="md"><p>${esc(r.whatItIs || '')}</p><p><b>Why it matters:</b> ${esc(r.whyItMatters || '')}</p>${r.howToRecognize ? `<p><b>How to use it:</b> ${esc(r.howToRecognize)}</p>` : ''}</div></div>`;
      } catch (e) { hOut.innerHTML = `<div class="error small">${esc(e.message || 'Help is unavailable (AI backend not configured yet).')}</div>`; }
    };
    bWhat.onclick = () => askExplain('what');
    bEx.onclick = () => askExplain('examples');
    bRes.onclick = () => { Store.setSetting('resourceSection', 'general'); ctx.go('resources'); };

    // Composer
    const composer = document.createElement('div'); composer.className = 'card';
    if (tab.input === 'weekly') {
      composer.innerHTML = `<div class="step-label">Weekly Check-In</div>
        <label class="small muted">What am I celebrating (what's working)?</label><textarea class="input" id="w1" rows="2"></textarea>
        <label class="small muted">What isn't working?</label><textarea class="input" id="w2" rows="2"></textarea>
        <label class="small muted">What do I need to focus on next?</label><textarea class="input" id="w3" rows="2"></textarea>`;
      const add = document.createElement('button'); add.className = 'btn'; add.textContent = 'Save this week'; add.style.marginTop = '10px';
      add.onclick = () => {
        const c = composer.querySelector('#w1').value.trim(), n = composer.querySelector('#w2').value.trim(), f = composer.querySelector('#w3').value.trim();
        if (!c && !n && !f) return;
        const text = `**Celebrating:** ${c || '—'}\n\n**Not working:** ${n || '—'}\n\n**Focus next:** ${f || '—'}`;
        Store.addTabEntry(active, text); toast('Check-in saved'); render(container, ctx);
      };
      composer.appendChild(add);
    } else {
      const ta = document.createElement('textarea'); ta.className = 'input'; ta.rows = 3; ta.placeholder = 'Write an entry…';
      composer.appendChild(ta);
      if (window.UI && UI.addInputTools) UI.addInputTools(ta, { upload: false, mic: true });
      const add = document.createElement('button'); add.className = 'btn'; add.textContent = 'Add entry'; add.style.marginTop = '10px';
      add.onclick = () => { const v = ta.value.trim(); if (!v) return; Store.addTabEntry(active, v); toast('Saved'); render(container, ctx); };
      composer.appendChild(add);
    }
    container.appendChild(composer);

    // Declarations tab: AI helper to reverse a limiting belief into a declaration.
    if (active === 'declarations') {
      const helper = document.createElement('div'); helper.className = 'card soft';
      helper.innerHTML = `<div class="ai-assist-label">✨ Turn a limiting belief into a declaration</div><p class="muted small" style="margin:0 0 8px">Uses the TriMetrix mindset framework to name the distortion and give you truth to declare.</p>`;
      const lb = document.createElement('input'); lb.className = 'input'; lb.placeholder = 'e.g. “I\'m too late to start something new.”';
      const go = document.createElement('button'); go.className = 'btn ghost small'; go.textContent = 'Reverse it'; go.style.marginTop = '8px';
      const out = document.createElement('div'); out.style.marginTop = '10px';
      go.onclick = async () => {
        const v = lb.value.trim(); if (!v) return; go.disabled = true; go.textContent = 'Thinking…';
        try {
          const r = await Api.declarationHelper({ limitingBelief: v, trackId: Store.getTrack(), coachInstructions: Content.track().coachInstructions });
          out.innerHTML = `<div class="card" style="margin:0">${r.distortion ? `<p><b>Likely distortion:</b> ${esc(r.distortion)}</p>` : ''}${r.reframe ? `<p><b>The truth:</b> ${esc(r.reframe)}</p>` : ''}${r.reversingQuestion ? `<p><b>Ask yourself:</b> ${esc(r.reversingQuestion)}</p>` : ''}<p><b>Declaration:</b> ${esc(r.declaration || '')}</p></div>`;
          if (r.declaration) { const add = document.createElement('button'); add.className = 'btn small'; add.textContent = 'Save this declaration'; add.onclick = () => { Store.addTabEntry('declarations', r.declaration); toast('Declaration saved'); render(container, ctx); }; out.querySelector('.card').appendChild(add); }
        } catch (e) { out.innerHTML = `<div class="error small">${esc(e.message || 'The AI helper is unavailable (backend not configured yet).')}</div>`; }
        finally { go.disabled = false; go.textContent = 'Reverse it'; }
      };
      helper.appendChild(lb); helper.appendChild(go); helper.appendChild(out); container.appendChild(helper);
    }

    // Entries
    const entries = Store.getTab(active);
    const list = document.createElement('div');
    if (!entries.length) { list.innerHTML = '<div class="empty">No entries yet. Start capturing what surfaces — over time these become clues to who you are.</div>'; }
    entries.forEach((e) => {
      const row = document.createElement('div'); row.className = 'list-note';
      const body = document.createElement('div'); body.style.flex = '1';
      body.innerHTML = `<div class="md">${window.marked ? marked.parse(e.text || '') : esc(e.text)}</div><div class="when">${fmt(e.at)}</div>`;
      const del = document.createElement('button'); del.className = 'iconbtn ghost'; del.textContent = '✕'; del.title = 'Delete';
      del.onclick = () => { Store.deleteTabEntry(active, e.id); render(container, ctx); };
      row.appendChild(body); row.appendChild(del); list.appendChild(row);
    });
    container.appendChild(list);

    if (tab.linkTool) {
      const foot = document.createElement('div'); foot.className = 'card';
      foot.innerHTML = `<p class="muted" style="margin:0 0 10px">Ready to pull the threads together?</p>`;
      const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Generate a Themes & Gold summary →'; b.onclick = () => ctx.go(tab.linkTool);
      foot.appendChild(b); container.appendChild(foot);
    }
  }
  window.Tools = window.Tools || {};
  window.Tools['journal'] = { render };
})();
