// Workspace store for the VisionOne Coaching Hub.
// localStorage is the always-on local working copy (also powers guest mode). When
// signed in, the same workspace syncs to the server (Azure Blob via /api/workspace)
// so it persists across devices and can be shared with a coach. Keeping all reads/
// writes behind this module means the guest→account swap touches one file.
window.Store = (function () {
  const KEY = 'vochb.workspace.v1';
  const OWNER = 'vochb.workspace.owner';

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); pushSoon(); }

  const ws = load();
  function ensureShape() {
    ws.profile = ws.profile || {};              // { name, track, season, transitionContext }
    ws.journey = ws.journey || {};              // { [exerciseId]: { [stepId]: value } }
    ws.tabs = ws.tabs || {};                    // { [tabId]: [ {at,text} ] }
    ws.goalPlans = ws.goalPlans || [];          // [ { id, title, createdAt, versions:[{savedAt,label,data}] } ]
    ws.assessment = ws.assessment || null;      // { savedAt, rawText, report, structured }
    ws.reports = ws.reports || [];              // saved generated reports (markdown)
    ws.requests = ws.requests || [];            // [ {id,type,note,status,createdAt} ]
    ws.settings = ws.settings || {};
    ws.coachHistory = ws.coachHistory || [];    // AI Coach Companion chat
    ws.sharing = ws.sharing || { consent: false, coachEmail: '' };
    ws.coachingNotes = ws.coachingNotes || [];  // notes from the human coach (two-way visible)
    ws.coachingSessions = ws.coachingSessions || []; // logged coaching calls/meetings (coach-authored, two-way visible)
  }
  ensureShape();

  // ---- server sync (active only when signed in) ----
  let _principal = null; let _pushTimer = null; let _onSync = null; let _me = { signedIn: false };
  function applyServer(server) {
    Object.keys(ws).forEach((k) => { delete ws[k]; });
    Object.assign(ws, server || {}); ensureShape();
    localStorage.setItem(KEY, JSON.stringify(ws));
  }
  async function pushNow() {
    if (!_principal) return;
    try {
      const r = await fetch('/api/workspace', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace: ws }) });
      if (!r.ok) console.warn('[Store] workspace sync failed:', r.status);
    } catch (e) { console.warn('[Store] workspace sync error:', e && e.message); }
  }
  function pushSoon() { if (!_principal) return; clearTimeout(_pushTimer); _pushTimer = setTimeout(pushNow, 1500); }
  async function initSync(onSynced) {
    _onSync = onSynced;
    try {
      const me = await fetch('/.auth/me').then((r) => (r.ok ? r.json() : null)).catch(() => null);
      const cp = me && me.clientPrincipal;
      if (!cp || !cp.userId) return { signedIn: false };
      _principal = cp;
      const prevOwner = localStorage.getItem(OWNER);
      const differentUser = prevOwner && prevOwner !== cp.userId;
      if (differentUser) { localStorage.removeItem(KEY); Object.keys(ws).forEach((k) => delete ws[k]); ensureShape(); }
      localStorage.setItem(OWNER, cp.userId);
      _me = await fetch('/api/me').then((x) => (x.ok ? x.json() : null)).catch(() => null) || { signedIn: true, email: cp.userDetails, isCoach: false };
      const r = await fetch('/api/workspace').then((x) => (x.ok ? x.json() : null)).catch(() => null);
      if (r && r.workspace && Object.keys(r.workspace).length) applyServer(r.workspace);
      else if (!differentUser) await pushNow();
      if (_onSync) _onSync();
      return { signedIn: true, email: cp.userDetails };
    } catch (e) { return { signedIn: false }; }
  }

  const uid = (p) => (p || 'x') + Date.now() + Math.floor(Math.random() * 1000);

  return {
    initSync,
    account() { return _principal ? { signedIn: true, email: _principal.userDetails, provider: _principal.identityProvider } : { signedIn: false }; },
    me() { return _me || { signedIn: false }; },
    // Real role from the server takes precedence; in guest/local mode a demo
    // "view as" override lets you preview each role. (In production the server
    // role always wins because _me.role is set.)
    role() {
      if (_me && _me.role) return _me.role;
      if (_me && _me.isAdmin) return 'admin';
      if (_me && _me.isCoach) return 'coach';
      return this.getSetting('previewRole') || 'coachee';
    },
    setPreviewRole(r) { this.setSetting('previewRole', r); },
    isServerRole() { return !!(_me && (_me.role || _me.isCoach || _me.isAdmin)); },
    isCoach() { const r = this.role(); return r === 'coach' || r === 'admin'; },
    isAdmin() { return this.role() === 'admin'; },
    raw() { return ws; },
    exportAll() { return JSON.stringify(ws, null, 2); },
    wipe() { localStorage.removeItem(KEY); location.reload(); },

    // ---- profile & track ----
    getProfile() { return ws.profile; },
    setProfile(p) { ws.profile = { ...ws.profile, ...p }; save(ws); },
    getTrack() { return ws.profile.track || 'ministry'; },
    setTrack(id) { ws.profile.track = id; save(ws); },
    // Readable one-line summary of profile + demographics, for AI grounding.
    demographicsSummary() {
      const p = ws.profile || {}; const d = p.demographics || {};
      const parts = [];
      if (p.name) parts.push('Name: ' + p.name);
      if (p.transitionContext) parts.push('Transition: ' + p.transitionContext);
      if (p.readiness) parts.push('Readiness: ' + p.readiness);
      Object.keys(d).forEach((k) => { if (d[k]) parts.push(k + ': ' + d[k]); });
      return parts.join(' · ').slice(0, 800);
    },

    // ---- journey (exercise responses) ----
    getExercise(exerciseId) { return ws.journey[exerciseId] || {}; },
    getStep(exerciseId, stepId) { return (ws.journey[exerciseId] || {})[stepId]; },
    setStep(exerciseId, stepId, value) {
      ws.journey[exerciseId] = ws.journey[exerciseId] || {};
      ws.journey[exerciseId][stepId] = value;
      ws.journey[exerciseId]._updatedAt = new Date().toISOString();
      save(ws);
    },
    // progress: fraction (0..1) of steps with any content, for a list of exercises
    progressFor(exercises) {
      let total = 0, done = 0;
      (exercises || []).forEach((ex) => {
        (ex.steps || []).forEach((st) => {
          total++;
          const v = this.getStep(ex.id, st.id);
          if (v && (Array.isArray(v) ? v.some((x) => x && String(x).trim()) : String(v).trim())) done++;
        });
      });
      return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
    },

    // ---- journal tabs ----
    getTab(tabId) { return ws.tabs[tabId] || []; },
    addTabEntry(tabId, text) { ws.tabs[tabId] = ws.tabs[tabId] || []; ws.tabs[tabId].unshift({ id: uid('t'), at: new Date().toISOString(), text }); save(ws); },
    updateTabEntry(tabId, id, text) { ws.tabs[tabId] = (ws.tabs[tabId] || []).map((e) => e.id === id ? { ...e, text, at: new Date().toISOString() } : e); save(ws); },
    deleteTabEntry(tabId, id) { ws.tabs[tabId] = (ws.tabs[tabId] || []).filter((e) => e.id !== id); save(ws); },

    // ---- goals & plans (versioned) ----
    getGoalPlans() { return ws.goalPlans || []; },
    getGoalPlan(id) { return (ws.goalPlans || []).find((g) => g.id === id); },
    createGoalPlan(title, data) {
      const plan = { id: uid('g'), title: title || 'My Plan', createdAt: new Date().toISOString(), versions: [{ savedAt: new Date().toISOString(), label: 'v1', data: data || {} }] };
      ws.goalPlans.unshift(plan); save(ws); return plan;
    },
    saveGoalVersion(id, data, label) {
      const plan = this.getGoalPlan(id); if (!plan) return null;
      const v = { savedAt: new Date().toISOString(), label: label || ('v' + (plan.versions.length + 1)), data: data || {} };
      plan.versions.unshift(v); save(ws); return v;
    },
    renameGoalPlan(id, title) { const p = this.getGoalPlan(id); if (p) { p.title = title; save(ws); } },
    deleteGoalPlan(id) { ws.goalPlans = ws.goalPlans.filter((g) => g.id !== id); save(ws); },

    // ---- assessment (TriMetrix HD) ----
    getAssessment() { return ws.assessment; },
    setAssessment(a) { ws.assessment = { savedAt: new Date().toISOString(), ...a }; save(ws); },
    clearAssessment() { ws.assessment = null; save(ws); },

    // ---- reports (saved generated docs) ----
    getReports() { return ws.reports || []; },
    saveReport(r) { ws.reports.unshift({ id: uid('r'), createdAt: new Date().toISOString(), ...r }); ws.reports = ws.reports.slice(0, 40); save(ws); },
    deleteReport(id) { ws.reports = ws.reports.filter((x) => x.id !== id); save(ws); },

    // ---- requests (new assessment / debrief) ----
    getRequests() { return ws.requests || []; },
    addRequest(type, note) { const req = { id: uid('req'), type, note: note || '', status: 'requested', createdAt: new Date().toISOString() }; ws.requests.unshift(req); save(ws); return req; },
    updateRequest(id, patch) { ws.requests = ws.requests.map((r) => r.id === id ? { ...r, ...patch } : r); save(ws); },

    // ---- coach sharing & notes ----
    getSharing() { return ws.sharing || { consent: false, coachEmail: '' }; },
    setSharing(s) { ws.sharing = { ...(ws.sharing || {}), ...s }; save(ws); },
    getCoachingNotes() { return ws.coachingNotes || []; },
    getCoachingSessions() { return ws.coachingSessions || []; },

    // ---- AI coach companion chat ----
    getCoachHistory() { return ws.coachHistory; },
    addCoachTurn(role, content) { ws.coachHistory.push({ role, content }); ws.coachHistory = ws.coachHistory.slice(-40); save(ws); },
    clearCoachHistory() { ws.coachHistory = []; save(ws); },

    getSetting(k) { return ws.settings[k]; },
    setSetting(k, v) { ws.settings[k] = v; save(ws); },

    // ---- Core Values card sort ----
    getCoreValues() {
      const d = { stage: 1, index: 0, kept: [], passed: [], maybe: [], narrowed: [], top: [], meanings: {}, statements: {}, custom: [] };
      // Backfill any missing keys so records created before new fields (e.g. `maybe`) don't break.
      ws.coreValues = Object.assign({}, d, ws.coreValues || {});
      return ws.coreValues;
    },
    setCoreValues(patch) { const cv = this.getCoreValues(); Object.assign(cv, patch); ws.coreValues = cv; save(ws); return cv; },
    resetCoreValues() { ws.coreValues = { stage: 1, index: 0, kept: [], passed: [], narrowed: [], top: [], meanings: {}, statements: {}, custom: [] }; save(ws); },
  };
})();
