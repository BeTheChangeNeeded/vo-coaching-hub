// Admin — usage tracker dashboard, resource manager (upload files + add links,
// tagged by section & track), and data utilities. Admin-gated.
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SECTIONS = ['general', 'anchors', 'identity', 'mission', 'calling', 'vision', 'launch', 'assessment'];
  const TRACKS = ['ministry', 'military', 'business', 'career'];

  function render(container, ctx) {
    container.innerHTML = '';
    renderAnalytics(container);
    renderResourceManager(container);
    renderDataUtils(container);
  }

  // ---------- Usage tracker ----------
  function renderAnalytics(container) {
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 10px">📊 Usage tracker</h3><div id="anBody"><p class="muted">Loading…</p></div>`;
    container.appendChild(card);
    Api.adminAnalytics().then((a) => {
      const el = card.querySelector('#anBody');
      const t = a.totals || {};
      const stat = (label, val) => `<div class="stat"><div class="stat-num">${val != null ? val : 0}</div><div class="stat-label">${esc(label)}</div></div>`;
      const bars = (obj) => {
        const entries = Object.entries(obj || {}); const max = Math.max(1, ...entries.map(([, v]) => v));
        return entries.map(([k, v]) => `<div class="bar-row"><span class="bar-label">${esc(k)}</span><span class="bar"><span style="width:${Math.round((v / max) * 100)}%"></span></span><span class="bar-num">${v}</span></div>`).join('') || '<p class="muted small">No data yet.</p>';
      };
      el.innerHTML =
        (a.sample ? '<div class="badge wait" style="margin-bottom:10px">Showing sample data (sign in as an admin on the deployed site for live numbers)</div>' : '') +
        `<div class="stat-grid">${stat('Total users', t.users)}${stat('Active last 7d', t.activeLast7)}${stat('Active last 30d', t.activeLast30)}${stat('TriMetrix uploaded', t.assessmentsUploaded)}${stat('Plans created', t.plansCreated)}${stat('Sharing w/ coach', t.sharingWithCoach)}</div>
        <div class="grid2" style="margin-top:16px">
          <div><h4 style="margin:0 0 8px">By path</h4>${bars(a.byTrack)}</div>
          <div><h4 style="margin:0 0 8px">Section engagement</h4>${bars(a.byPillarStarted)}</div>
        </div>`;
      if (a.recent && a.recent.length) {
        const rows = a.recent.map((r) => `<tr><td>${esc(r.name || '—')}</td><td>${esc(r.track || '')}</td><td>${r.plans || 0}</td><td>${r.assessment ? '✓' : ''}</td><td>${r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : ''}</td></tr>`).join('');
        el.insertAdjacentHTML('beforeend', `<h4 style="margin:16px 0 8px">Recent activity</h4><table class="grid"><thead><tr><th>Name</th><th>Path</th><th>Plans</th><th>Assessment</th><th>Last active</th></tr></thead><tbody>${rows}</tbody></table>`);
      }
    }).catch((e) => { card.querySelector('#anBody').innerHTML = `<div class="error small">${esc(e.message || 'Could not load analytics.')}</div>`; });
  }

  // ---------- Resource manager ----------
  function renderResourceManager(container) {
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 6px">📚 Resource manager</h3><p class="muted small" style="margin:0 0 12px">Add clickable links or upload downloadable files. Tag each by section and (optionally) which paths it's for. Coachees see these in the Resources tab.</p><div id="resList"></div>`;
    container.appendChild(card);
    let current = [];
    const listEl = card.querySelector('#resList');

    function drawList() {
      if (!current.length) { listEl.innerHTML = '<div class="empty">No custom resources yet. Add one below.</div>'; return; }
      listEl.innerHTML = '';
      current.forEach((r) => {
        const row = document.createElement('div'); row.className = 'list-note';
        row.innerHTML = `<div style="flex:1"><b>${esc(r.title)}</b> <span class="badge">${esc(r.section)}</span> ${(r.tracks || []).map((t) => `<span class="badge">${esc(t)}</span>`).join('')} ${r.download ? '<span class="badge ok">file</span>' : '<span class="badge">link</span>'}<div class="when">${esc(r.description || r.url)}</div></div>`;
        const del = document.createElement('button'); del.className = 'iconbtn ghost'; del.textContent = '✕'; del.onclick = async () => { current = current.filter((x) => x.id !== r.id); await save(); drawList(); };
        row.appendChild(del); listEl.appendChild(row);
      });
    }
    async function save() { try { await Api.saveResources({ resources: current }); toast('Resources saved'); } catch (e) { toast(e.message || 'Save failed (admin only)'); } }

    Api.resources().then((d) => { current = d.resources || []; drawList(); if (!d.canEdit) card.insertAdjacentHTML('beforeend', '<p class="muted small">Note: saving requires an admin account on the deployed site.</p>'); }).catch(() => { drawList(); });

    // Add form
    const form = document.createElement('div'); form.className = 'card soft';
    form.innerHTML = `<div class="ai-assist-label">Add a resource</div>
      <div class="grid2">
        <div><label class="small muted">Title</label><input class="input" id="rTitle" placeholder="e.g. Values Card Sort (PDF)"></div>
        <div><label class="small muted">Type</label><select class="input" id="rType">${['Website', 'Article', 'Video', 'PDF', 'PowerPoint', 'Word document', 'Worksheet', 'Book', 'Tool', 'Assessment', 'Program', 'Link'].map((t) => `<option value="${t}">${t}</option>`).join('')}</select></div>
        <div><label class="small muted">Section</label><select class="input" id="rSection">${SECTIONS.map((s) => `<option value="${s}">${s}</option>`).join('')}</select></div>
        <div><label class="small muted">Paths (leave all unchecked = all)</label><div id="rTracks">${TRACKS.map((t) => `<label class="chk"><input type="checkbox" value="${t}"> ${t}</label>`).join('')}</div></div>
      </div>
      <label class="small muted">Description</label><input class="input" id="rDesc" placeholder="One line about what it is">
      <div class="grid2" style="margin-top:8px">
        <div><label class="small muted">Link URL — for websites, videos (YouTube/Vimeo), or any online resource</label><input class="input" id="rUrl" placeholder="https://…"></div>
        <div><label class="small muted">…or upload a file (PDF, PPT, Word — downloadable, max 8&nbsp;MB)</label><input type="file" id="rFile" class="input" accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.mp4"></div>
      </div>
      <p class="muted small" style="margin:8px 0 0">Tip: for videos and websites, paste the <b>Link URL</b> (e.g. a YouTube link). Upload files for documents you want people to download. Large videos should be linked, not uploaded.</p>`;
    const addBtn = document.createElement('button'); addBtn.className = 'btn'; addBtn.textContent = 'Add resource'; addBtn.style.marginTop = '10px';
    const status = document.createElement('span'); status.className = 'field-status'; status.style.marginLeft = '10px';
    addBtn.onclick = async () => {
      const title = form.querySelector('#rTitle').value.trim(); if (!title) { toast('Title required'); return; }
      const tracks = Array.from(form.querySelectorAll('#rTracks input:checked')).map((c) => c.value);
      const rec = { section: form.querySelector('#rSection').value, type: form.querySelector('#rType').value.trim() || 'Link', title, description: form.querySelector('#rDesc').value.trim(), tracks };
      const url = form.querySelector('#rUrl').value.trim();
      const file = form.querySelector('#rFile').files[0];
      addBtn.disabled = true; status.textContent = 'Saving…';
      try {
        if (file) {
          const base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
          const up = await Api.uploadResourceFile({ filename: file.name, base64, contentType: file.type });
          rec.url = up.url; rec.download = true;
        } else if (url) { rec.url = url; rec.download = false; }
        else { toast('Add a link URL or a file'); addBtn.disabled = false; status.textContent = ''; return; }
        current = [rec, ...current];
        await save(); drawList();
        form.querySelector('#rTitle').value = ''; form.querySelector('#rDesc').value = ''; form.querySelector('#rUrl').value = ''; form.querySelector('#rFile').value = '';
        status.textContent = 'Added ✓';
      } catch (e) { status.innerHTML = `<span class="error">${esc(e.message || 'Upload failed (storage/admin required).')}</span>`; }
      finally { addBtn.disabled = false; }
    };
    form.appendChild(addBtn); form.appendChild(status);
    card.appendChild(form);
  }

  // ---------- Data utilities ----------
  function renderDataUtils(container) {
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<h3 style="font-family:var(--wt-font-head);margin:0 0 10px">🛠️ Data</h3><p class="muted small">Manage your own workspace copy.</p>`;
    const row = document.createElement('div'); row.className = 'btn-row';
    const exp = document.createElement('button'); exp.className = 'btn ghost'; exp.textContent = 'Export my workspace (JSON)';
    exp.onclick = () => { const blob = new Blob([Store.exportAll()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'coaching-workspace.json'; a.click(); };
    const wipe = document.createElement('button'); wipe.className = 'btn danger'; wipe.textContent = 'Reset local workspace';
    wipe.onclick = () => { if (confirm('This clears your local copy on this browser. Continue?')) Store.wipe(); };
    row.appendChild(exp); row.appendChild(wipe); card.appendChild(row);
    container.appendChild(card);
  }

  window.Tools = window.Tools || {};
  window.Tools['admin'] = { render };
})();
