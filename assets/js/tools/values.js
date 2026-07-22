// Core Values Card Sort — an interactive re-creation of the VisionOne "Unstoppable"
// core-values card deck. A curated ~52-card deck (not overwhelming). Each card shows
// the value, a short description, and an example of how it shows up in life. The user
// sorts Yes / Maybe / No; maybes resurface during narrowing until resolved. They then
// choose a top 3-5, reflect, and write value statements. Final values flow into the
// Identity → Core Personal Values exercise for reports & AI.
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Curated 52 — broad coverage across character, faith, relationships, growth, impact, and lifestyle.
  const VALUES = ['Abundance', 'Achievement', 'Adaptability', 'Adventure', 'Ambition', 'Authenticity', 'Balance', 'Boldness', 'Community', 'Compassion', 'Connection', 'Contentment', 'Courage', 'Creativity', 'Curiosity', 'Discipline', 'Excellence', 'Faith', 'Family', 'Forgiveness', 'Freedom', 'Friendships', 'Fun', 'Generosity', 'Gratitude', 'Growth', 'Health', 'Honesty', 'Hospitality', 'Humility', 'Impact', 'Independence', 'Influence', 'Innovation', 'Integrity', 'Joy', 'Justice', 'Kindness', 'Leadership', 'Learning', 'Legacy', 'Love', 'Loyalty', 'Mastery', 'Peace', 'Perseverance', 'Purpose', 'Respect', 'Responsibility', 'Service', 'Stewardship', 'Wisdom'];
  const FAITH_VALUES = new Set(['Faith']);

  let INFO = null;

  function deck() {
    const faith = window.Content && Content.faith && Content.faith();
    const base = VALUES.slice();
    if (!faith) base.sort((a, b) => (FAITH_VALUES.has(a) ? 1 : 0) - (FAITH_VALUES.has(b) ? 1 : 0));
    const cv = Store.getCoreValues();
    return base.concat((cv.custom || []).filter((c) => !base.includes(c)));
  }
  const info = (v) => (INFO && INFO[v]) || { d: '', e: '' };

  function render(container, ctx) {
    if (!INFO) {
      container.innerHTML = '<div class="card"><p class="muted">Loading the value deck…</p></div>';
      fetch('/data/content/values.json').then((r) => r.json()).then((j) => { INFO = j; render(container, ctx); }).catch(() => { INFO = {}; render(container, ctx); });
      return;
    }
    container.innerHTML = '';
    const cv = Store.getCoreValues();
    const head = document.createElement('div'); head.className = 'card';
    head.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">🃏 Core Values Card Sort</h3>
      <p class="muted" style="margin:0">Your values are the compass of your identity. Work through the deck — keep, pass, or set aside as a "maybe" — then narrow to your top 3–5.</p>` +
      (Content.faith && Content.faith() ? `<div class="card scripture" style="margin-top:10px"><div class="scripture-line">"…I count all things to be loss in view of the surpassing value of knowing Christ Jesus my Lord…" — Philippians 3:8</div></div>` : '');
    container.appendChild(head);

    // "What are core values?" — helps people avoid picking values that just "sound good."
    const collapsed = Store.getSetting('valuesIntroCollapsed');
    const intro = document.createElement('div'); intro.className = 'card';
    if (collapsed) {
      intro.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--wt-font-head)">💡 What are core values?</b><button class="btn ghost xsmall" id="viToggle">Show</button></div>`;
    } else {
      intro.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h3 style="font-family:var(--wt-font-head);margin:0">💡 What are core values?</h3><button class="btn ghost xsmall" id="viToggle">Hide</button></div>
        <div class="md" style="margin-top:8px">
          <p><b>Core values</b> are the handful of deeply held principles that <i>actually</i> guide your decisions, priorities, and behavior — the compass beneath how you really live. They're not rules you follow; they're what you'd fight to protect.</p>
          <p><b>Core values vs. ethical (moral) values.</b> Ethical values — like honesty, fairness, or not harming others — are shared standards of right and wrong that <i>most</i> people hold. Core values are the specific few that are central to <b>you</b> and shape how you uniquely show up. Honesty may be an ethic everyone shares; but <i>adventure</i>, <i>legacy</i>, or <i>excellence</i> being in your top five is what makes your compass yours.</p>
          <p><b>Choose what's true, not what sounds good.</b> The biggest trap is picking impressive-sounding values instead of real ones. Aim for <i>actual</i> over <i>aspirational</i>. To find the real ones, look at the evidence:</p>
          <ul>
            <li><b>Where your time, money, and energy actually go</b> — your calendar and bank statement don't lie.</li>
            <li><b>What you protect</b> and won't compromise, even when it costs you.</li>
            <li><b>What makes you angry</b> — anger often flags a value being violated.</li>
            <li><b>When you felt most alive or most proud</b> — which value was being honored?</li>
          </ul>
          <p>Don't overthink it, and don't try to pick the "right" answer. There isn't one. Trust your gut as you sort the deck — you can always revisit. ${Content.faith && Content.faith() ? 'For a deeper dive, see the VisionOne <b>Unstoppable</b> book (linked in Resources).' : 'For a deeper dive, see the VisionOne <b>Unstoppable</b> resource.'}</p>
        </div>`;
    }
    container.appendChild(intro);
    intro.querySelector('#viToggle').onclick = () => { Store.setSetting('valuesIntroCollapsed', !collapsed); render(container, ctx); };

    const steps = ['Sort the deck', 'Narrow & revisit maybes', 'Choose your top 3–5', 'Reflect & declare'];
    const bar = document.createElement('div'); bar.className = 'tabbar';
    steps.forEach((s, i) => { const b = document.createElement('button'); b.textContent = `${i + 1}. ${s}`; b.classList.toggle('active', cv.stage === i + 1); b.onclick = () => { Store.setCoreValues({ stage: i + 1 }); render(container, ctx); }; bar.appendChild(b); });
    container.appendChild(bar);

    if (cv.stage === 1) stageSort(container, ctx);
    else if (cv.stage === 2) stageNarrow(container, ctx);
    else if (cv.stage === 3) stageTop(container, ctx);
    else stageReflect(container, ctx);
  }

  // Stage 1 — one card at a time: Yes / Maybe / No
  function stageSort(container, ctx) {
    const cv = Store.getCoreValues(); const d = deck();
    const card = document.createElement('div'); card.className = 'card';
    if (cv.index >= d.length) {
      card.innerHTML = `<p>You kept <b>${cv.kept.length}</b> values${cv.maybe.length ? ` and set aside <b>${cv.maybe.length}</b> maybe${cv.maybe.length > 1 ? 's' : ''}` : ''}. Ready to narrow down?</p>`;
      const row = document.createElement('div'); row.className = 'btn-row';
      const next = document.createElement('button'); next.className = 'btn'; next.textContent = 'Narrow & revisit maybes →'; next.onclick = () => { Store.setCoreValues({ stage: 2, narrowed: cv.kept.slice() }); render(container, ctx); };
      const restart = document.createElement('button'); restart.className = 'btn ghost'; restart.textContent = 'Start over'; restart.onclick = () => { if (confirm('Restart the card sort?')) { Store.resetCoreValues(); render(container, ctx); } };
      row.appendChild(next); row.appendChild(restart); card.appendChild(row); container.appendChild(card); return;
    }
    const value = d[cv.index]; const nfo = info(value);
    card.innerHTML = `<div class="progress" style="margin-bottom:10px"><span style="width:${Math.round((cv.index / d.length) * 100)}%"></span></div>
      <div class="progress-label" style="margin-bottom:14px">Card ${cv.index + 1} of ${d.length} · kept ${cv.kept.length} · maybe ${cv.maybe.length}</div>
      <div class="value-card">${esc(value)}</div>
      ${nfo.d ? `<p style="text-align:center;margin:0 0 4px"><b>${esc(nfo.d)}</b></p>` : ''}
      ${nfo.e ? `<p class="muted small" style="text-align:center;max-width:520px;margin:0 auto 6px"><i>${esc(nfo.e)}</i></p>` : ''}
      <p class="muted small" style="text-align:center">Is this a core value that guides your decisions and behavior?</p>`;
    const row = document.createElement('div'); row.className = 'btn-row'; row.style.justifyContent = 'center';
    const pass = document.createElement('button'); pass.className = 'btn ghost'; pass.textContent = '❌ No'; pass.onclick = () => advance('no');
    const maybe = document.createElement('button'); maybe.className = 'btn accent'; maybe.textContent = '🤔 Maybe'; maybe.onclick = () => advance('maybe');
    const keep = document.createElement('button'); keep.className = 'btn'; keep.textContent = '✓ Yes'; keep.onclick = () => advance('yes');
    row.appendChild(pass); row.appendChild(maybe); row.appendChild(keep); card.appendChild(row);

    const under = document.createElement('div'); under.className = 'btn-row'; under.style.justifyContent = 'center'; under.style.marginTop = '6px';
    if (cv.index > 0) { const back = document.createElement('button'); back.className = 'btn ghost xsmall'; back.textContent = '↶ Undo'; back.onclick = () => { const prev = d[cv.index - 1]; Store.setCoreValues({ index: cv.index - 1, kept: cv.kept.filter((x) => x !== prev), maybe: cv.maybe.filter((x) => x !== prev), passed: cv.passed.filter((x) => x !== prev) }); render(container, ctx); }; under.appendChild(back); }
    card.appendChild(under); container.appendChild(card);

    const add = document.createElement('div'); add.className = 'card soft';
    add.innerHTML = `<div class="ai-assist-label">Add a value that's missing</div>`;
    const arow = document.createElement('div'); arow.className = 'list-row';
    const inp = document.createElement('input'); inp.className = 'input'; inp.placeholder = 'e.g. Sustainability';
    const ab = document.createElement('button'); ab.className = 'btn ghost small'; ab.textContent = 'Add & keep';
    ab.onclick = () => { const v = inp.value.trim(); if (!v) return; const custom = (cv.custom || []).concat([v]); const kept = cv.kept.concat([v]); Store.setCoreValues({ custom, kept }); toast('Added ' + v); render(container, ctx); };
    arow.appendChild(inp); arow.appendChild(ab); add.appendChild(arow); container.appendChild(add);

    function advance(choice) {
      const patch = { index: cv.index + 1 };
      if (choice === 'yes') patch.kept = cv.kept.concat([value]).filter((v, i, a) => a.indexOf(v) === i);
      else if (choice === 'maybe') patch.maybe = cv.maybe.concat([value]).filter((v, i, a) => a.indexOf(v) === i);
      else patch.passed = cv.passed.concat([value]);
      Store.setCoreValues(patch); render(container, ctx);
    }
  }

  // Stage 2 — resolve maybes (Yes/No), then narrow keepers
  function stageNarrow(container, ctx) {
    const cv = Store.getCoreValues();
    const narrowed = (cv.narrowed && cv.narrowed.length ? cv.narrowed : cv.kept).slice();

    // A) Revisit maybes
    if (cv.maybe && cv.maybe.length) {
      const mcard = document.createElement('div'); mcard.className = 'card';
      mcard.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">Revisit your maybes (${cv.maybe.length})</h3><p class="muted" style="margin:0 0 12px">Decide on each one — is it truly a core value, or not?</p>`;
      cv.maybe.forEach((v) => {
        const nfo = info(v);
        const row = document.createElement('div'); row.className = 'card soft'; row.style.marginBottom = '10px';
        row.innerHTML = `<b>${esc(v)}</b>${nfo.d ? ` — <span class="muted small">${esc(nfo.d)}</span>` : ''}${nfo.e ? `<div class="muted small"><i>${esc(nfo.e)}</i></div>` : ''}`;
        const br = document.createElement('div'); br.className = 'btn-row'; br.style.marginTop = '8px';
        const yes = document.createElement('button'); yes.className = 'btn small'; yes.textContent = '✓ Yes, keep'; yes.onclick = () => { Store.setCoreValues({ maybe: cv.maybe.filter((x) => x !== v), kept: cv.kept.concat([v]).filter((a, i, arr) => arr.indexOf(a) === i), narrowed: narrowed.concat([v]).filter((a, i, arr) => arr.indexOf(a) === i) }); render(container, ctx); };
        const no = document.createElement('button'); no.className = 'btn ghost small'; no.textContent = '❌ No'; no.onclick = () => { Store.setCoreValues({ maybe: cv.maybe.filter((x) => x !== v), passed: cv.passed.concat([v]) }); render(container, ctx); };
        br.appendChild(yes); br.appendChild(no); row.appendChild(br); mcard.appendChild(row);
      });
      container.appendChild(mcard);
    }

    // B) Narrow keepers
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">Your keepers (${narrowed.length})</h3><p class="muted" style="margin:0 0 6px">Tap to remove any that aren't <b>truly</b> core. Aim for about 10.</p>`;
    const chips = document.createElement('div'); chips.className = 'chip-cloud';
    narrowed.forEach((v) => { const c = document.createElement('button'); c.className = 'value-chip'; c.title = info(v).d || ''; c.innerHTML = `${esc(v)} <span class="x">✕</span>`; c.onclick = () => { Store.setCoreValues({ narrowed: narrowed.filter((x) => x !== v) }); render(container, ctx); }; chips.appendChild(c); });
    if (!narrowed.length) chips.innerHTML = '<p class="muted small">No keepers yet — go back to the deck or resolve your maybes.</p>';
    card.appendChild(chips);
    const row = document.createElement('div'); row.className = 'btn-row';
    const back = document.createElement('button'); back.className = 'btn ghost'; back.textContent = '← Back to deck'; back.onclick = () => { Store.setCoreValues({ stage: 1 }); render(container, ctx); };
    const next = document.createElement('button'); next.className = 'btn'; next.textContent = 'Choose my top 3–5 →'; next.disabled = narrowed.length < 3;
    next.onclick = () => { Store.setCoreValues({ stage: 3, narrowed }); render(container, ctx); };
    row.appendChild(back); row.appendChild(next); card.appendChild(row);
    if (cv.maybe && cv.maybe.length) card.insertAdjacentHTML('beforeend', '<p class="muted small">Tip: resolve your maybes above before continuing.</p>');
    container.appendChild(card);
  }

  // Stage 3 — pick top 3-5 (click order = rank)
  function stageTop(container, ctx) {
    const cv = Store.getCoreValues();
    const pool = (cv.narrowed && cv.narrowed.length ? cv.narrowed : cv.kept).slice();
    const top = cv.top.slice();
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<p class="muted">Click to select your <b>top 3–5</b> (in order of importance). Click again to remove.</p>`;
    const chips = document.createElement('div'); chips.className = 'chip-cloud';
    pool.forEach((v) => {
      const rank = top.indexOf(v);
      const c = document.createElement('button'); c.className = 'value-chip' + (rank >= 0 ? ' selected' : ''); c.title = info(v).d || '';
      c.innerHTML = (rank >= 0 ? `<span class="rank">${rank + 1}</span> ` : '') + esc(v);
      c.onclick = () => { let t = top.slice(); if (rank >= 0) t = t.filter((x) => x !== v); else if (t.length < 5) t.push(v); else { toast('Top 5 max — remove one first'); return; } Store.setCoreValues({ top: t }); render(container, ctx); };
      chips.appendChild(c);
    });
    card.appendChild(chips);
    const row = document.createElement('div'); row.className = 'btn-row';
    const back = document.createElement('button'); back.className = 'btn ghost'; back.textContent = '← Back'; back.onclick = () => { Store.setCoreValues({ stage: 2 }); render(container, ctx); };
    const next = document.createElement('button'); next.className = 'btn'; next.textContent = 'Reflect on my values →'; next.disabled = top.length < 3;
    next.onclick = () => { finalizeToJourney(top); Store.setCoreValues({ stage: 4 }); render(container, ctx); };
    row.appendChild(back); row.appendChild(next); card.appendChild(row);
    if (top.length < 3) card.insertAdjacentHTML('beforeend', '<p class="muted small">Pick at least 3 to continue.</p>');
    container.appendChild(card);
  }

  // Stage 4 — reflect + value statements
  function stageReflect(container, ctx) {
    const cv = Store.getCoreValues();
    if (!cv.top.length) { const c = document.createElement('div'); c.className = 'empty'; c.textContent = 'Choose your top values first.'; container.appendChild(c); return; }
    const intro = document.createElement('div'); intro.className = 'card';
    intro.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">Your core values</h3><p class="muted" style="margin:0">${cv.top.map((v, i) => `<span class="badge ok" style="margin:2px">${i + 1}. ${esc(v)}</span>`).join(' ')}</p>`;
    container.appendChild(intro);

    cv.top.forEach((v) => {
      const nfo = info(v);
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `<div class="step-label">${esc(v)}</div>${nfo.d ? `<p class="muted small" style="margin:2px 0 0">${esc(nfo.d)}</p>` : ''}`;
      const m = document.createElement('div'); m.className = 'step';
      m.innerHTML = `<div class="step-prompt">What does <b>${esc(v)}</b> mean to you? Why is it important?</div>`;
      const mt = document.createElement('textarea'); mt.className = 'input'; mt.rows = 2; mt.value = (cv.meanings || {})[v] || '';
      mt.addEventListener('input', () => { const meanings = Store.getCoreValues().meanings || {}; meanings[v] = mt.value; Store.setCoreValues({ meanings }); });
      m.appendChild(mt); if (window.UI && UI.addInputTools) UI.addInputTools(mt, { upload: false, mic: true }); card.appendChild(m);
      const s = document.createElement('div'); s.className = 'step';
      s.innerHTML = `<div class="step-prompt">Write a value statement: “I value ${esc(v)} because…” or “I value ${esc(v)}, therefore…”</div>`;
      const st = document.createElement('input'); st.className = 'input'; st.value = (cv.statements || {})[v] || ''; st.placeholder = `I value ${v} because…`;
      st.addEventListener('input', () => { const statements = Store.getCoreValues().statements || {}; statements[v] = st.value; Store.setCoreValues({ statements }); });
      const srow = document.createElement('div'); srow.className = 'input-with-mic'; srow.appendChild(st); if (window.UI && UI.miniMic) srow.appendChild(UI.miniMic(st)); s.appendChild(srow);
      card.appendChild(s); container.appendChild(card);
    });

    const foot = document.createElement('div'); foot.className = 'card';
    foot.innerHTML = `<p class="muted" style="margin:0 0 10px">Test your values over the next couple of weeks — filter decisions through them and journal what you notice. Your top values are saved to your Identity section.</p>`;
    const row = document.createElement('div'); row.className = 'btn-row';
    const save = document.createElement('button'); save.className = 'btn'; save.textContent = 'Save to my Identity'; save.onclick = () => { finalizeToJourney(cv.top); toast('Saved to Identity → Core Personal Values'); ctx.go('identity'); };
    const journal = document.createElement('button'); journal.className = 'btn ghost'; journal.textContent = 'Open my Journal'; journal.onclick = () => ctx.go('journal');
    const restart = document.createElement('button'); restart.className = 'btn ghost'; restart.textContent = 'Start over'; restart.onclick = () => { if (confirm('Restart the card sort?')) { Store.resetCoreValues(); render(container, ctx); } };
    row.appendChild(save); row.appendChild(journal); row.appendChild(restart); foot.appendChild(row); container.appendChild(foot);
  }

  function finalizeToJourney(top) {
    const cv = Store.getCoreValues();
    const lines = top.map((v) => (cv.statements && cv.statements[v]) ? cv.statements[v] : (cv.meanings && cv.meanings[v] ? `${v} — ${cv.meanings[v]}` : v));
    if (window.Store && Store.setStep) Store.setStep('core-values', 'values', lines);
  }

  window.Tools = window.Tools || {};
  window.Tools['values'] = { render };
})();
