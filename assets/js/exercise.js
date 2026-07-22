// Reusable Exercise Player. Renders any exercise from the content model:
// Purpose / Scripture / Science cards + step inputs (text, textarea, list, pairs,
// table, wheel), autosaves each step, and offers per-exercise help:
//   • "What is this?"  — AI explains the exercise in depth (track + demographic aware)
//   • "See examples"   — AI concrete example answers for this audience
//   • "Resources"      — jumps to the Resources tab filtered to this section
//   • "Help me reflect" — per-step reflective prompts
// Dictation (🎤) is available on every text field. AI results are cached per
// (track + exercise) so buttons are instant on repeat.
window.ExercisePlayer = (function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const md = (s) => window.marked ? marked.parse(s || '') : esc(s);
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  function saveBadge(el) {
    let b = el.querySelector('.save-badge');
    if (!b) { b = document.createElement('span'); b.className = 'save-badge'; el.appendChild(b); }
    b.textContent = 'Saved ✓'; b.classList.add('show');
    clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('show'), 1200);
  }
  function withMic(inputEl) {
    const row = document.createElement('div'); row.className = 'input-with-mic';
    row.appendChild(inputEl);
    if (window.UI && UI.miniMic) row.appendChild(UI.miniMic(inputEl));
    return row;
  }

  // ---- per-input renderers ----
  function renderText(ex, st, val, onChange) {
    const i = document.createElement('input');
    i.type = 'text'; i.className = 'input'; i.value = val || ''; i.placeholder = st.example ? ('e.g. ' + st.example) : '';
    i.addEventListener('input', () => onChange(i.value));
    return withMic(i);
  }
  function renderTextarea(ex, st, val, onChange) {
    const wrap = document.createElement('div');
    const ta = document.createElement('textarea');
    ta.className = 'input textarea'; ta.rows = 4; ta.value = val || ''; ta.placeholder = st.example ? ('e.g. ' + st.example) : 'Write your reflection…';
    ta.addEventListener('input', () => onChange(ta.value));
    wrap.appendChild(ta);
    if (window.UI && UI.addInputTools) UI.addInputTools(ta, { upload: true, mic: true });
    return wrap;
  }
  function renderList(ex, st, val, onChange) {
    const items = Array.isArray(val) ? val.slice() : (val ? [val] : ['']);
    if (!items.length) items.push('');
    const wrap = document.createElement('div'); wrap.className = 'list-input';
    function commit() { onChange(items.filter((x) => x != null)); }
    function draw() {
      wrap.innerHTML = '';
      items.forEach((it, idx) => {
        const rowEl = document.createElement('div'); rowEl.className = 'list-row';
        const i = document.createElement('input'); i.type = 'text'; i.className = 'input'; i.value = it || ''; i.placeholder = (idx === 0 && st.example) ? ('e.g. ' + st.example) : ('Item ' + (idx + 1));
        i.addEventListener('input', () => { items[idx] = i.value; commit(); });
        const mic = (window.UI && UI.miniMic) ? UI.miniMic(i) : document.createElement('span');
        const del = document.createElement('button'); del.className = 'iconbtn ghost'; del.type = 'button'; del.textContent = '✕';
        del.onclick = () => { items.splice(idx, 1); if (!items.length) items.push(''); commit(); draw(); };
        rowEl.appendChild(i); rowEl.appendChild(mic); rowEl.appendChild(del); wrap.appendChild(rowEl);
      });
      const add = document.createElement('button'); add.className = 'btn ghost small'; add.type = 'button'; add.textContent = '+ Add';
      add.onclick = () => { items.push(''); commit(); draw(); };
      wrap.appendChild(add);
    }
    draw();
    return wrap;
  }
  function renderPairs(ex, st, val, onChange) {
    const rows = Array.isArray(val) ? val.slice() : [];
    if (!rows.length) rows.push({ left: '', right: '' });
    const wrap = document.createElement('div'); wrap.className = 'pairs-input';
    function commit() { onChange(rows); }
    function draw() {
      wrap.innerHTML = `<div class="pairs-head"><span>${esc(st.leftLabel || 'From')}</span><span>${esc(st.rightLabel || 'To')}</span><span></span></div>`;
      rows.forEach((r, idx) => {
        const rowEl = document.createElement('div'); rowEl.className = 'pairs-row';
        const l = document.createElement('input'); l.type = 'text'; l.className = 'input'; l.value = r.left || ''; l.placeholder = st.leftLabel || 'From';
        const rr = document.createElement('input'); rr.type = 'text'; rr.className = 'input'; rr.value = r.right || ''; rr.placeholder = st.rightLabel || 'To';
        l.addEventListener('input', () => { r.left = l.value; commit(); });
        rr.addEventListener('input', () => { r.right = rr.value; commit(); });
        const del = document.createElement('button'); del.className = 'iconbtn ghost'; del.type = 'button'; del.textContent = '✕';
        del.onclick = () => { rows.splice(idx, 1); if (!rows.length) rows.push({ left: '', right: '' }); commit(); draw(); };
        rowEl.appendChild(l); rowEl.appendChild(rr); rowEl.appendChild(del); wrap.appendChild(rowEl);
      });
      const add = document.createElement('button'); add.className = 'btn ghost small'; add.type = 'button'; add.textContent = '+ Add pair';
      add.onclick = () => { rows.push({ left: '', right: '' }); commit(); draw(); };
      wrap.appendChild(add);
    }
    draw();
    return wrap;
  }
  function renderTable(ex, st, val, onChange) {
    const cols = st.columns || ['Item'];
    const rows = Array.isArray(val) ? val.slice() : [];
    if (!rows.length) rows.push(cols.map(() => ''));
    const wrap = document.createElement('div'); wrap.className = 'table-input';
    function commit() { onChange(rows); }
    function draw() {
      wrap.innerHTML = '<table class="grid"><thead><tr>' + cols.map((c) => `<th>${esc(c)}</th>`).join('') + '<th></th></tr></thead><tbody></tbody></table>';
      const tb = wrap.querySelector('tbody');
      rows.forEach((r, ri) => {
        const tr = document.createElement('tr');
        cols.forEach((c, ci) => {
          const td = document.createElement('td');
          const i = document.createElement('input'); i.type = 'text'; i.className = 'input'; i.value = (r && r[ci]) || '';
          i.addEventListener('input', () => { rows[ri] = rows[ri] || []; rows[ri][ci] = i.value; commit(); });
          td.appendChild(i); tr.appendChild(td);
        });
        const tdd = document.createElement('td');
        const del = document.createElement('button'); del.className = 'iconbtn ghost'; del.type = 'button'; del.textContent = '✕';
        del.onclick = () => { rows.splice(ri, 1); if (!rows.length) rows.push(cols.map(() => '')); commit(); draw(); };
        tdd.appendChild(del); tr.appendChild(tdd); tb.appendChild(tr);
      });
      const add = document.createElement('button'); add.className = 'btn ghost small'; add.type = 'button'; add.textContent = '+ Add row';
      add.onclick = () => { rows.push(cols.map(() => '')); commit(); draw(); };
      wrap.appendChild(add);
    }
    draw();
    return wrap;
  }
  function renderWheel(ex, st, val, onChange) {
    const areas = st.areas || [];
    const data = Object.assign({}, val || {});
    const wrap = document.createElement('div'); wrap.className = 'wheel-input';
    areas.forEach((a) => {
      const rowEl = document.createElement('div'); rowEl.className = 'wheel-row';
      const label = document.createElement('label'); label.textContent = a;
      const range = document.createElement('input'); range.type = 'range'; range.min = 0; range.max = 10; range.step = 1; range.value = data[a] != null ? data[a] : 5;
      const num = document.createElement('span'); num.className = 'wheel-num'; num.textContent = range.value;
      range.addEventListener('input', () => { num.textContent = range.value; data[a] = Number(range.value); onChange(data); });
      rowEl.appendChild(label); rowEl.appendChild(range); rowEl.appendChild(num); wrap.appendChild(rowEl);
    });
    return wrap;
  }
  const RENDERERS = { text: renderText, textarea: renderTextarea, list: renderList, pairs: renderPairs, table: renderTable, wheel: renderWheel };

  // Universal per-field help: available on EVERY text box. Lets the coachee get
  // examples, reflective prompts, or ask a free-form question about this field.
  function stepHelp(ex, st, stepEl) {
    const box = document.createElement('div'); box.className = 'step-help';
    const bar = document.createElement('div'); bar.className = 'step-help-bar';
    const bEx = mk('💡 Examples'); const bReflect = mk('✨ Prompts'); const bAsk = mk('💬 Ask a question');
    bar.appendChild(bEx); bar.appendChild(bReflect); bar.appendChild(bAsk);
    const out = document.createElement('div'); out.className = 'step-help-out';
    box.appendChild(bar); box.appendChild(out);

    function mk(t) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost xsmall'; b.textContent = t; return b; }
    function target() { return stepEl.querySelector('textarea') || stepEl.querySelector('input[type=text]'); }
    function current() { const t = target(); return t ? t.value : ''; }
    function insert(text) { const t = target(); if (!t) return; t.value = t.value ? (t.value + (t.tagName === 'TEXTAREA' ? '\n\n' : ' ') + text) : text; t.dispatchEvent(new Event('input', { bubbles: true })); }

    async function call(mode, question) {
      out.innerHTML = '<p class="muted small">Thinking…</p>';
      try {
        const track = window.Content && Content.track ? Content.track() : null;
        const assessment = window.Store && Store.getAssessment ? Store.getAssessment() : null;
        const res = await window.Api.exerciseAssist({
          mode, question, exerciseTitle: ex.title, purpose: ex.purpose, stepLabel: st.label, stepPrompt: st.prompt,
          current: current(), trackId: track && track.id, coachInstructions: track && track.coachInstructions,
          demographics: window.Store ? Store.demographicsSummary() : '',
          assessment: assessment ? (assessment.report || (assessment.rawText || '')).toString().slice(0, 1600) : '',
        });
        const label = mode === 'examples' ? '💡 Examples' : mode === 'ask' ? '💬 Answer' : '✨ Prompts';
        out.innerHTML = `<div class="card soft"><div class="ai-assist-label">${label}</div><div class="md">${md(res.suggestions || '')}</div><button type="button" class="btn ghost xsmall insert-btn">Use as a starting point</button></div>`;
        out.querySelector('.insert-btn').onclick = () => { insert(res.suggestions || ''); out.innerHTML = ''; };
      } catch (e) { out.innerHTML = `<div class="error small">${esc(e.message || 'Help is unavailable (AI backend not configured yet).')}</div>`; }
    }
    bEx.onclick = () => call('examples');
    bReflect.onclick = () => call('reflect');
    bAsk.onclick = () => {
      out.innerHTML = '';
      const wrap = document.createElement('div'); wrap.className = 'ask-row';
      const inp = document.createElement('input'); inp.className = 'input'; inp.placeholder = 'Ask anything about this — e.g. “What counts as a limiting belief?”';
      const go = document.createElement('button'); go.className = 'btn small'; go.textContent = 'Ask';
      const submit = () => { const q = inp.value.trim(); if (q) call('ask', q); };
      go.onclick = submit; inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
      wrap.appendChild(inp); wrap.appendChild(go); out.appendChild(wrap); inp.focus();
    };
    return box;
  }

  // Exercise-level explainer + examples (cached per track+exercise).
  async function loadExplain(ex) {
    const track = Content.track();
    const key = 'explain:' + (track && track.id) + ':' + ex.id;
    const cached = Store.getSetting(key);
    if (cached) return cached;
    const res = await Api.explain({
      exerciseTitle: ex.title, purpose: ex.purpose,
      stepPrompt: (ex.steps && ex.steps[0] && ex.steps[0].prompt) || '',
      trackId: track && track.id, coachInstructions: track && track.coachInstructions,
      demographics: Store.demographicsSummary(),
    });
    Store.setSetting(key, res);
    return res;
  }

  function renderExercise(container, ex, opts) {
    opts = opts || {};
    const card = document.createElement('article'); card.className = 'exercise card';
    card.innerHTML = `<div class="exercise-head"><h3>${esc(ex.title)}</h3></div>` + (ex.purpose ? `<p class="exercise-purpose">${esc(ex.purpose)}</p>` : '');

    // Help buttons row
    const help = document.createElement('div'); help.className = 'help-row';
    const bExplain = document.createElement('button'); bExplain.type = 'button'; bExplain.className = 'btn ghost small'; bExplain.innerHTML = '❓ What is this?';
    const bEx = document.createElement('button'); bEx.type = 'button'; bEx.className = 'btn ghost small'; bEx.innerHTML = '💡 See examples';
    const bRes = document.createElement('button'); bRes.type = 'button'; bRes.className = 'btn ghost small'; bRes.innerHTML = '📚 Resources on this';
    help.appendChild(bExplain); help.appendChild(bEx); help.appendChild(bRes);
    card.appendChild(help);
    const helpOut = document.createElement('div'); helpOut.className = 'help-out'; card.appendChild(helpOut);

    bExplain.onclick = () => showExplain('explain');
    bEx.onclick = () => showExplain('examples');
    bRes.onclick = () => { if (opts.sectionId && window.Store) Store.setSetting('resourceSection', opts.sectionId); (opts.go || (() => {}))('resources'); };
    async function showExplain(which) {
      helpOut.innerHTML = '<p class="muted small">Thinking…</p>';
      try {
        const r = await loadExplain(ex);
        if (which === 'examples') {
          helpOut.innerHTML = `<div class="card soft"><div class="ai-assist-label">💡 Examples</div><ul class="md">${(r.examples || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
        } else {
          helpOut.innerHTML = `<div class="card soft"><div class="ai-assist-label">❓ What this is & why it matters</div><div class="md"><p>${esc(r.whatItIs || '')}</p><p><b>Why it matters:</b> ${esc(r.whyItMatters || '')}</p>${r.howToRecognize ? `<p><b>How to approach it:</b> ${esc(r.howToRecognize)}</p>` : ''}</div></div>`;
        }
      } catch (e) { helpOut.innerHTML = `<div class="error small">${esc(e.message || 'The explainer is unavailable (backend not configured yet).')}</div>`; }
    }

    if (ex.scripture && ex.scripture.length) card.insertAdjacentHTML('beforeend', `<div class="card scripture"><span class="chip-label">✝ Scripture</span>${ex.scripture.map((s) => `<div class="scripture-line">${esc(s)}</div>`).join('')}</div>`);
    if (ex.science) card.insertAdjacentHTML('beforeend', `<div class="card science"><span class="chip-label">🔬 The science</span><div>${esc(ex.science)}</div></div>`);

    (ex.steps || []).forEach((st) => {
      const stepEl = document.createElement('div'); stepEl.className = 'step';
      stepEl.innerHTML = `<div class="step-label">${esc(st.label || '')}</div><div class="step-prompt">${esc(st.prompt || '')}</div>`;
      const renderer = RENDERERS[st.input] || renderText;
      const cur = Store.getStep(ex.id, st.id);
      const save = debounce((v) => { Store.setStep(ex.id, st.id, v); saveBadge(stepEl); if (opts.onSave) opts.onSave(); }, 500);
      stepEl.appendChild(renderer(ex, st, cur, save));
      // Per-field help (examples / prompts / ask a question) on every text box.
      if (st.input !== 'wheel') stepEl.appendChild(stepHelp(ex, st, stepEl));
      if (st.linkTool && opts.go) {
        const link = document.createElement('button'); link.className = 'btn ghost small'; link.type = 'button'; link.textContent = 'Open the ' + st.linkTool + ' tool →';
        link.onclick = () => opts.go(st.linkTool); stepEl.appendChild(link);
      }
      card.appendChild(stepEl);
    });
    container.appendChild(card);
    return card;
  }

  return { renderExercise };
})();
