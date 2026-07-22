// AI Coach Companion — a chat guide grounded in the coachee's track, journey
// progress, and TriMetrix assessment. Needs the API; degrades gracefully offline.
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const md = (s) => window.marked ? marked.parse(s || '') : esc(s);

  function render(container, ctx) {
    container.innerHTML = ''; // avoid stacking duplicate cards on re-render (e.g. Clear conversation)
    const wrap = document.createElement('div'); wrap.className = 'card';
    wrap.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">💬 AI Coach Companion</h3><p class="muted" style="margin:0 0 6px">A guide who knows your path, your progress, and (if uploaded) your TriMetrix HD. Ask anything — clarity on your calling, a stuck point, next steps.</p>`;
    const log = document.createElement('div'); log.className = 'chat-log'; wrap.appendChild(log);

    const hist = Store.getCoachHistory();
    if (!hist.length) {
      const starter = document.createElement('div'); starter.className = 'msg assistant';
      const name = Store.getProfile().name;
      starter.innerHTML = md(`Hi${name ? ' ' + esc(name) : ''} — I'm here to walk with you. A few ways I can help:\n\n- Reflect on what's surfacing in your **Identity** or **Calling** work\n- Make sense of your **TriMetrix HD** results\n- Turn a dream into a concrete next step\n\nWhat's on your mind today?`);
      log.appendChild(starter);
    }
    hist.forEach((m) => addMsg(log, m.role, m.content));

    const bar = document.createElement('div'); bar.className = 'chat-input';
    const inp = document.createElement('input'); inp.className = 'input'; inp.placeholder = 'Type your message…';
    const send = document.createElement('button'); send.className = 'btn'; send.textContent = 'Send';
    bar.appendChild(inp); bar.appendChild(send); wrap.appendChild(bar);

    const tools = document.createElement('div'); tools.className = 'btn-row';
    const clear = document.createElement('button'); clear.className = 'btn ghost small'; clear.textContent = 'Clear conversation'; clear.onclick = () => { Store.clearCoachHistory(); render(container, ctx); };
    tools.appendChild(clear); wrap.appendChild(tools);
    container.appendChild(wrap);

    async function submit() {
      const text = inp.value.trim(); if (!text) return;
      inp.value = ''; Store.addCoachTurn('user', text); addMsg(log, 'user', text);
      const thinking = addMsg(log, 'assistant', '…'); send.disabled = true;
      try {
        const track = Content.track();
        const res = await Api.coachCompanion({
          message: text,
          history: Store.getCoachHistory().slice(-12),
          trackId: track.id, coachInstructions: track.coachInstructions,
          context: buildContext(),
          assessment: assessmentText(),
        });
        const answer = res.answer || res.reply || '';
        thinking.querySelector('.md').innerHTML = md(answer);
        Store.addCoachTurn('assistant', answer);
        if (res.suggestedResources && res.suggestedResources.length) {
          const extra = document.createElement('div'); extra.className = 'msg assistant'; extra.innerHTML = md('**You might explore:**\n' + res.suggestedResources.map((r) => '- ' + (typeof r === 'string' ? r : r.title)).join('\n')); log.appendChild(extra);
        }
        // Warm hand-off to a certified VisionOne coach (Career Hub approach).
        if (res.referToCoach && res.referToCoach.recommend) {
          const ho = document.createElement('div'); ho.className = 'msg assistant handoff';
          ho.innerHTML = `<div class="md"><b>This is a great one to take to a VisionOne coach.</b>${res.referToCoach.reason ? `<br><span class="muted small">${esc(res.referToCoach.reason)}</span>` : ''}</div>`;
          const btn = document.createElement('button'); btn.className = 'btn small'; btn.style.marginTop = '8px'; btn.textContent = 'Request a VisionOne coach';
          btn.onclick = async () => {
            btn.disabled = true; btn.textContent = 'Sending…';
            Store.addRequest('session', 'From AI Coach: ' + (res.referToCoach.reason || 'requested a coach'));
            try { await Api.submitRequest({ type: 'session', note: res.referToCoach.reason || 'Requested via AI Coach Companion', coachEmail: Store.getSharing().coachEmail, profile: { name: Store.getProfile().name } }); } catch (e) { /* stored locally */ }
            btn.outerHTML = '<span class="muted small">Request sent — a VisionOne coach will reach out ✓</span>';
          };
          ho.appendChild(btn); log.appendChild(ho);
        }
      } catch (e) {
        thinking.querySelector('.md').innerHTML = `<span class="error small">${esc(e.message || 'The coach is unavailable right now (the AI backend may not be configured yet).')}</span>`;
      } finally { send.disabled = false; log.scrollTop = log.scrollHeight; }
    }
    send.onclick = submit; inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    log.scrollTop = log.scrollHeight;
  }

  function buildContext() {
    const parts = [];
    if (Store.demographicsSummary) parts.push(Store.demographicsSummary());
    // Pull a few key journey answers for grounding.
    const keys = [['identity', 'core-values', 'values'], ['mission', 'mission-statement', 'statement'], ['calling', 'ikigai', 'convergence']];
    keys.forEach(([ex, , st]) => { const v = Store.getStep(ex, st); if (v) parts.push(`${ex}: ${Array.isArray(v) ? v.join('; ') : v}`); });
    return parts.filter(Boolean).join('\n').slice(0, 2200);
  }

  // Rich TriMetrix HD context for the AI coach (structured debrief + raw excerpt).
  function assessmentText() {
    const a = Store.getAssessment(); if (!a) return '';
    const s = a.structured || {}; const parts = [];
    if (s.behavioralStyle) parts.push('DISC style: ' + s.behavioralStyle);
    if (s.drivingForces && s.drivingForces.length) parts.push('Driving forces: ' + s.drivingForces.join(', '));
    if (s.strengths && s.strengths.length) parts.push('Strengths: ' + s.strengths.join('; '));
    if (s.blindSpots && s.blindSpots.length) parts.push('Growth edges: ' + s.blindSpots.join('; '));
    if (a.report) parts.push('Summary: ' + a.report);
    if (a.rawText) parts.push('Report excerpt: ' + String(a.rawText).slice(0, 1200));
    return parts.join('\n').slice(0, 3000);
  }

  function addMsg(log, role, content) {
    const el = document.createElement('div'); el.className = 'msg ' + (role === 'user' ? 'user' : 'assistant');
    el.innerHTML = `<div class="md">${content === '…' ? '<span class="muted">…</span>' : md(content)}</div>`;
    log.appendChild(el); log.scrollTop = log.scrollHeight; return el;
  }
  window.Tools = window.Tools || {};
  window.Tools['coach-companion'] = { render };
})();
