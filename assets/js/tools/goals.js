// Goals & Plans — build a plan and save multiple versions as it evolves. Fully
// client-side (works offline). Each plan keeps a version history you can revisit.
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const FIELDS = [
    ['vision', 'The vision this plan serves', 'What future is this plan moving you toward?'],
    ['goals', 'Goals (SMART)', 'What specific, measurable goals are you committing to?', 'list'],
    ['steps', 'First action steps', 'What will you do first? Keep them small and concrete.', 'list'],
    ['obstacles', 'Obstacles & how I\'ll respond', 'What might get in the way, and how will you handle it?', 'list'],
    ['support', 'Support & accountability', 'Who will walk with you, and how often will you check in?'],
    ['metrics', 'How I\'ll measure progress', 'What tells you it\'s working?'],
  ];

  function render(container, ctx) {
    const plans = Store.getGoalPlans();
    const head = document.createElement('div'); head.className = 'card';
    head.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">🎯 Goals & Plans</h3><p class="muted" style="margin:0 0 10px">Build a plan and save versions as it grows. Your journey isn't linear — capture how the plan evolves over time.</p>`;
    const nb = document.createElement('button'); nb.className = 'btn'; nb.textContent = '+ New plan';
    nb.onclick = () => { const p = Store.createGoalPlan('My Plan', {}); Store.setSetting('openPlan', p.id); render(container, ctx); };
    head.appendChild(nb); container.appendChild(head);

    if (!plans.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'No plans yet. Create your first plan to get started.'; container.appendChild(e); return; }

    let openId = Store.getSetting('openPlan');
    if (!plans.some((p) => p.id === openId)) openId = plans[0].id;

    // Plan selector
    const sel = document.createElement('div'); sel.className = 'tabbar';
    plans.forEach((p) => { const b = document.createElement('button'); b.textContent = p.title; b.classList.toggle('active', p.id === openId); b.onclick = () => { Store.setSetting('openPlan', p.id); render(container, ctx); }; sel.appendChild(b); });
    container.appendChild(sel);

    const plan = Store.getGoalPlan(openId);
    const current = (plan.versions[0] && plan.versions[0].data) || {};
    const working = JSON.parse(JSON.stringify(current)); // edits held until "Save version"

    const editor = document.createElement('div'); editor.className = 'card';
    const titleRow = document.createElement('div'); titleRow.className = 'list-row';
    const titleIn = document.createElement('input'); titleIn.className = 'input'; titleIn.value = plan.title; titleIn.style.fontWeight = '700';
    titleIn.addEventListener('input', () => Store.renameGoalPlan(plan.id, titleIn.value));
    const delp = document.createElement('button'); delp.className = 'iconbtn ghost'; delp.textContent = '🗑 Delete plan'; delp.onclick = () => { if (confirm('Delete this plan and all versions?')) { Store.deleteGoalPlan(plan.id); render(container, ctx); } };
    titleRow.appendChild(titleIn); titleRow.appendChild(delp); editor.appendChild(titleRow);

    FIELDS.forEach(([key, label, hint, type]) => {
      const step = document.createElement('div'); step.className = 'step';
      step.innerHTML = `<div class="step-label">${esc(label)}</div><div class="step-prompt">${esc(hint)}</div>`;
      if (type === 'list') {
        const items = Array.isArray(working[key]) ? working[key].slice() : []; if (!items.length) items.push('');
        const wrap = document.createElement('div');
        const draw = () => {
          wrap.innerHTML = '';
          items.forEach((it, i) => {
            const row = document.createElement('div'); row.className = 'list-row';
            const inp = document.createElement('input'); inp.className = 'input'; inp.value = it || ''; inp.addEventListener('input', () => { items[i] = inp.value; working[key] = items; });
            const mic = (window.UI && UI.miniMic) ? UI.miniMic(inp) : document.createElement('span');
            const d = document.createElement('button'); d.className = 'iconbtn ghost'; d.textContent = '✕'; d.onclick = () => { items.splice(i, 1); if (!items.length) items.push(''); working[key] = items; draw(); };
            row.appendChild(inp); row.appendChild(mic); row.appendChild(d); wrap.appendChild(row);
          });
          const add = document.createElement('button'); add.className = 'btn ghost small'; add.textContent = '+ Add'; add.onclick = () => { items.push(''); working[key] = items; draw(); };
          wrap.appendChild(add);
        };
        draw(); step.appendChild(wrap);
      } else {
        const ta = document.createElement('textarea'); ta.className = 'input'; ta.rows = 2; ta.value = working[key] || ''; ta.addEventListener('input', () => { working[key] = ta.value; });
        step.appendChild(ta);
        if (window.UI && UI.addInputTools) UI.addInputTools(ta, { upload: false, mic: true });
      }
      editor.appendChild(step);
    });

    const saveRow = document.createElement('div'); saveRow.className = 'btn-row';
    const labelIn = document.createElement('input'); labelIn.className = 'input'; labelIn.placeholder = 'Version label (optional, e.g. “after coaching call”)'; labelIn.style.maxWidth = '320px';
    const save = document.createElement('button'); save.className = 'btn'; save.textContent = '💾 Save as new version';
    save.onclick = () => { Store.saveGoalVersion(plan.id, working, labelIn.value.trim() || undefined); toast('Version saved'); render(container, ctx); };
    saveRow.appendChild(labelIn); saveRow.appendChild(save); editor.appendChild(saveRow);
    container.appendChild(editor);

    // Version history
    const hist = document.createElement('div'); hist.className = 'card';
    hist.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 10px">Version history (${plan.versions.length})</h3>`;
    plan.versions.forEach((v, i) => {
      const row = document.createElement('div'); row.className = 'list-note';
      const goals = Array.isArray(v.data.goals) ? v.data.goals.filter(Boolean).length : 0;
      row.innerHTML = `<div style="flex:1"><b>${esc(v.label || ('v' + (plan.versions.length - i)))}</b> ${i === 0 ? '<span class="badge ok">current</span>' : ''}<div class="when">${new Date(v.savedAt).toLocaleString()} · ${goals} goal(s)</div></div>`;
      const view = document.createElement('button'); view.className = 'btn ghost small'; view.textContent = 'View';
      view.onclick = () => showVersion(plan, v);
      const restore = document.createElement('button'); restore.className = 'btn ghost small'; restore.textContent = 'Restore';
      restore.onclick = () => { Store.saveGoalVersion(plan.id, JSON.parse(JSON.stringify(v.data)), 'restored ' + (v.label || '')); toast('Restored as new version'); render(container, ctx); };
      row.appendChild(view); if (i !== 0) row.appendChild(restore); hist.appendChild(row);
    });
    container.appendChild(hist);
  }

  function showVersion(plan, v) {
    const parts = [];
    const d = v.data || {};
    const label = { vision: 'Vision', goals: 'Goals', steps: 'First steps', obstacles: 'Obstacles', support: 'Support', metrics: 'Metrics' };
    Object.keys(label).forEach((k) => {
      const val = d[k]; if (!val || (Array.isArray(val) && !val.filter(Boolean).length)) return;
      parts.push(`<h4>${label[k]}</h4>` + (Array.isArray(val) ? '<ul>' + val.filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join('') + '</ul>' : `<p>${esc(val)}</p>`));
    });
    UI.modal(esc(plan.title) + ' — ' + esc(v.label || ''), `<div class="md">${parts.join('') || '<p class="muted">Empty version.</p>'}</div>`);
  }
  window.Tools = window.Tools || {};
  window.Tools['goals'] = { render };
})();
