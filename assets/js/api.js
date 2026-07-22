// Thin API client. Points at the co-located Azure Functions (/api/*) in the demo.
// To move onto the shared backend later, change BASE to 'https://api.runmai.app'.
window.Api = (function () {
  const BASE = '/api';
  let selectedProvider = null; // chosen AI provider for A/B testing (azure | anthropic | openai)

  async function post(path, body) {
    const res = await fetch(`${BASE}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const fallback = res.status >= 500
        ? `The request took too long or hit an error (${res.status}). Long reports can exceed the time limit on slower models — try switching the AI model (top-left) to Azure GPT-4.1, which is faster.`
        : `Request failed (${res.status})`;
      throw new Error(data.error || fallback);
    }
    return data;
  }
  async function put(path, body) {
    const res = await fetch(`${BASE}/${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }
  async function get(path) {
    const res = await fetch(`${BASE}/${path}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }
  // Inject the selected provider into AI calls (an explicit provider in the payload wins — used by compare mode).
  const ai = (path, payload) => post(path, { provider: selectedProvider, ...payload });

  return {
    setProvider: (id) => { selectedProvider = id; },
    getProvider: () => selectedProvider,
    listProviders: () => get('providers'), // → { providers:[{id,label,configured}], default }

    // Coaching journey
    exerciseAssist: (payload) => ai('exercise-assist', payload),   // reflection prompts for a step
    explain: (payload) => ai('explain', payload),                  // "what is this?" + examples
    adminAnalytics: () => get('usage-analytics?_t=' + Date.now()), // admin usage dashboard
    coachCompanion: (payload) => ai('coach-companion', payload),   // AI coach chat
    trimetrixReport: (payload) => ai('trimetrix-report', payload), // parse + debrief TriMetrix HD
    journeySummary: (payload) => ai('journey-summary', payload),   // multi-section report (section-by-section)
    declarationHelper: (payload) => ai('declaration-helper', payload), // limiting belief → declaration
    submitRequest: (payload) => post('requests', payload),         // request new assessment / debrief

    // Coach ↔ coachee + shared data
    me: () => get('me'),
    coachClients: () => get('coach-clients'),
    coachClient: (userId) => get('coach-client?userId=' + encodeURIComponent(userId)),
    coachNote: (payload) => post('coach-note', payload),           // { userId, note }
    coachSession: (payload) => post('coach-note', { kind: 'session', ...payload }), // { userId, summary, transcript?, sessionDate? }
    resources: () => get('resources'),
    saveResources: (payload) => put('resources', payload),
    uploadResourceFile: (payload) => post('resource-upload', payload),
    notify: (payload) => post('notify', payload),
    extractFile: (payload) => post('extract', payload), // { filename, base64, contentType } → { text }
  };
})();

// Shared helpers used by tools.
window.UI = {
  intro(text, tips) {
    const items = (tips || []).map((t) => `<li>${t}</li>`).join('');
    return `<div class="card intro"><p style="margin:0 0 8px">${text}</p>
      <ul class="clean" style="margin:0">${items}</ul></div>`;
  },
  // Open a standalone, letterhead-styled document in a new window and print it,
  // with real "Page X of Y" footers. Chrome/Edge ignore CSS @page number boxes,
  // so we paginate the content into Letter-sized pages in JS (block-level).
  // Defensive: if pagination throws, it falls back to printing the un-paginated doc.
  openPrintDoc({ title, footer, styles, bodyHtml }) {
    const baseCss = `
      @page { size: letter; margin: 0; }
      * { box-sizing: border-box; }
      html,body { margin:0; padding:0; }
      body { font-family: Georgia,'Times New Roman',serif; color:#1f2933; line-height:1.5; font-size:11.5pt; background:#f1f5f9; }
      #paged { }
      .page { position: relative; width: 8.5in; min-height: 11in; height: 11in; margin: 0 auto 12px; padding: 0.7in 0.75in 0.9in; background:#fff; overflow: hidden; page-break-after: always; }
      .page:last-child { page-break-after: auto; }
      .page-footer { position:absolute; left:0.75in; right:0.75in; bottom:0.42in; border-top:1px solid #e2e8f0; padding-top:5px; font-family:Arial,Helvetica,sans-serif; font-size:8pt; color:#94a3b8; display:flex; justify-content:space-between; }
      #src { width:8.5in; margin:0 auto; padding:0.7in 0.75in; background:#fff; }
      .noprint { position:fixed; top:10px; right:10px; z-index:10; }
      button { font-family:Arial,sans-serif; padding:8px 14px; background:#649954; color:#fff; border:0; border-radius:6px; cursor:pointer; font-size:10pt; }
      @media print { .noprint{display:none;} body{background:#fff;} .page{margin:0;box-shadow:none;} }
    `;
    const footerJson = JSON.stringify(footer || '');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title || 'Report'}</title>
      <style>${baseCss}${styles || ''}</style></head><body>
      <div class="noprint"><button onclick="window.print()">Print / Save as PDF</button></div>
      <div id="paged"></div>
      <div id="src">${bodyHtml || ''}</div>
      <scr` + `ipt>
      (function(){
        function go(){
          try {
            var FOOTER=${footerJson};
            var USABLE=9.0*96; // px of content per page before spilling to the next
            var src=document.getElementById('src'), paged=document.getElementById('paged');
            var blocks=Array.prototype.slice.call(src.children);
            var pages=[];
            function newPage(){var p=document.createElement('div');p.className='page';var inner=document.createElement('div');inner.className='page-inner';p.appendChild(inner);paged.appendChild(p);pages.push(inner);return inner;}
            var cur=newPage();
            for(var i=0;i<blocks.length;i++){ var b=blocks[i]; cur.appendChild(b); if(cur.offsetHeight>USABLE && cur.children.length>1){ cur.removeChild(b); cur=newPage(); cur.appendChild(b); } }
            var total=pages.length;
            for(var j=0;j<pages.length;j++){ var f=document.createElement('div'); f.className='page-footer'; f.innerHTML='<span>'+FOOTER+'</span><span>Page '+(j+1)+' of '+total+'</span>'; pages[j].parentNode.appendChild(f); }
            src.parentNode.removeChild(src);
          } catch(e){ var s=document.getElementById('src'); if(s){s.style.background='#fff';} }
          setTimeout(function(){ window.print(); }, 400);
        }
        if(document.readyState==='complete') go(); else window.addEventListener('load', go);
      })();
      </scr` + `ipt></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { alert('Please allow pop-ups to open the report.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  },
  // In-app document viewer — read content without downloading.
  modal(title, innerHTML) {
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = `<div class="modal"><div class="modal-head"><h2>${title}</h2><button class="modal-x" aria-label="Close">✕</button></div><div class="modal-body">${innerHTML}</div></div>`;
    const close = () => ov.remove();
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    ov.querySelector('.modal-x').onclick = close;
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
    document.body.appendChild(ov);
    return close;
  },

  // Extract text from an uploaded file IN THE BROWSER (no large upload). Falls back
  // to the server only for unusual types. Handles big 1-hour-transcript Word docs.
  async extractClient(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'txt' || ext === 'md' || (file.type || '').startsWith('text/')) {
      return (await file.text()).trim();
    }
    if (ext === 'docx' && window.mammoth) {
      const ab = await file.arrayBuffer();
      const r = await window.mammoth.extractRawText({ arrayBuffer: ab });
      return (r.value || '').trim();
    }
    if (ext === 'pdf' && window.pdfjsLib) {
      const ab = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: ab }).promise;
      let out = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        out += tc.items.map((it) => it.str).join(' ') + '\n';
      }
      return out.trim();
    }
    // Fallback: server-side extract (small files only).
    const base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
    const { text } = await window.Api.extractFile({ filename: file.name, base64, contentType: file.type });
    return text;
  },

  // Badge showing which AI model produced a result (switch in the sidebar).
  modelBadge() {
    const id = window.Api && window.Api.getProvider && window.Api.getProvider();
    const p = (window.AIProviders || []).find((x) => x.id === id);
    return p ? `<span class="pill" title="Change in the sidebar → AI model (A/B)">🧠 ${p.label}</span>` : '';
  },

  // Download markdown/HTML as a Word document (.doc). Word opens HTML-based .doc
  // files natively, so this needs no server or library.
  downloadWordDoc(filename, title, bodyHtml) {
    const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${title || 'Report'}</title>
      <style>body{font-family:Georgia,'Times New Roman',serif;color:#1f2933;line-height:1.5;font-size:12pt;} h1,h2,h3{font-family:Arial,Helvetica,sans-serif;color:#14304a;} h1{font-size:20pt;} h2{font-size:15pt;} table{border-collapse:collapse;} td,th{border:1px solid #ccc;padding:6px;} .logo{color:#649954;font-weight:bold;font-size:10pt;letter-spacing:.08em;}</style></head>
      <body><p class="logo">VISIONONE COACHING HUB</p>${bodyHtml || ''}</body></html>`;
    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (filename || 'report').replace(/[^a-z0-9._-]+/gi, '_') + '.doc'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },

  downloadBase64(filename, base64, contentType) {
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: contentType || 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },

  // Compact inline 🎤 button that dictates into a single input (for list rows,
  // pairs, table cells — anywhere the full toolbar would be too heavy).
  miniMic(inputEl) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'iconbtn ghost mini-mic'; btn.title = 'Dictate'; btn.textContent = '🎤';
    if (!SR) { btn.style.display = 'none'; return btn; }
    let rec = null, listening = false, userStopped = false;
    btn.onclick = async () => {
      if (listening) { userStopped = true; if (rec) rec.stop(); return; }
      try { if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach((t) => t.stop()); } }
      catch { btn.title = 'Microphone blocked — allow it in your browser address bar'; return; }
      userStopped = false;
      rec = new SR(); rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US';
      rec.onstart = () => { listening = true; btn.classList.add('rec'); btn.textContent = '⏹'; };
      rec.onresult = (ev) => { let t = ''; for (let i = ev.resultIndex; i < ev.results.length; i++) t += ev.results[i][0].transcript; if (t.trim()) { inputEl.value = (inputEl.value ? inputEl.value + ' ' : '') + t.trim(); inputEl.dispatchEvent(new Event('input', { bubbles: true })); } };
      rec.onend = () => { if (!userStopped) { try { rec.start(); } catch { /* */ } return; } listening = false; btn.classList.remove('rec'); btn.textContent = '🎤'; };
      rec.start();
    };
    return btn;
  },

  // Adds an Upload (PDF/Word/text) + Dictate toolbar above a textarea/input.
  // opts: { upload:true, mic:true }
  addInputTools(el, opts) {
    if (!el || el.dataset.toolsAdded) return;
    el.dataset.toolsAdded = '1';
    const bar = document.createElement('div');
    bar.className = 'field-tools';
    const status = document.createElement('span');
    status.className = 'field-status';

    if (opts && opts.upload) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'iconbtn'; btn.innerHTML = '📎 Upload PDF / Word';
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.pdf,.docx,.txt,.md'; input.style.display = 'none';
      btn.onclick = () => input.click();
      input.onchange = async () => {
        const file = input.files[0]; if (!file) return;
        status.textContent = `Reading ${file.name}…`;
        try {
          const text = await window.UI.extractClient(file);
          el.value = text; status.textContent = `Loaded ${file.name} ✓ (${text.length.toLocaleString()} chars)`;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (e) { status.innerHTML = `<span class="error">${e.message || 'Could not read that file.'}</span>`; }
      };
      bar.appendChild(btn); bar.appendChild(input);
    }

    if (opts && opts.mic) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const mic = document.createElement('button');
        mic.type = 'button'; mic.className = 'iconbtn'; mic.innerHTML = '🎤 Dictate';
        let rec = null, listening = false, userStopped = false;
        mic.onclick = async () => {
          if (listening) { userStopped = true; if (rec) rec.stop(); return; }
          // Explicitly request mic permission first — SpeechRecognition alone often won't prompt.
          try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              const s = await navigator.mediaDevices.getUserMedia({ audio: true });
              s.getTracks().forEach((t) => t.stop());
            }
          } catch {
            status.innerHTML = `<span class="error">Microphone blocked. Click the mic/lock icon in your browser's address bar, choose <b>Allow</b> for the microphone, then click Dictate again.</span>`;
            return;
          }
          userStopped = false;
          const startRec = () => {
            rec = new SR(); rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US';
            rec.onstart = () => { listening = true; mic.classList.add('rec'); mic.innerHTML = '⏹ Stop'; status.textContent = 'Listening… (take your time; click Stop when done)'; };
            rec.onresult = (ev) => {
              let t = '';
              for (let i = ev.resultIndex; i < ev.results.length; i++) t += ev.results[i][0].transcript;
              if (t.trim()) { el.value = (el.value ? el.value + ' ' : '') + t.trim(); el.dispatchEvent(new Event('input', { bubbles: true })); }
            };
            rec.onerror = (e) => {
              if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                userStopped = true;
                status.innerHTML = `<span class="error">Allow microphone access in your browser (address-bar icon → Allow), then try again.</span>`;
              } // 'no-speech'/'aborted' are normal during pauses — onend will restart unless the user stopped.
            };
            // Auto-restart on silence so long, pause-filled answers keep recording until the user clicks Stop.
            rec.onend = () => {
              if (!userStopped) { try { rec.start(); } catch { /* restarts on next tick */ } return; }
              listening = false; mic.classList.remove('rec'); mic.innerHTML = '🎤 Dictate';
              if (String(status.textContent).startsWith('Listening')) status.textContent = '';
            };
            rec.start();
          };
          startRec();
        };
        bar.appendChild(mic);
      }
    }

    bar.appendChild(status);
    el.parentNode.insertBefore(bar, el);
  },
};
