// Content + lens engine. Loads the journey/mindset content and the active "track"
// (ministry / military / business), then applies the lens in two layers:
//   1) per-track VARIANTS — override title/purpose/statement/steps for a track
//   2) terminology TOKENS — swap {{tokens}} using the track's term map
// and hides scripture / faith-only items when the track isn't faith-based.
// This is the "adaptive learning" content axis: one core model, many audiences.
window.Content = (function () {
  const TRACKS = [
    { id: 'ministry', name: 'Identity to Impact', audience: 'Ministry / Faith' },
    { id: 'military', name: 'Mission Forward', audience: 'Service Member / First Responder' },
    { id: 'business', name: 'Lead With Purpose', audience: 'Business Leader' },
    { id: 'career', name: 'Career Compass', audience: 'Career Seeker in Transition' },
  ];

  let journey = null, mindset = null, track = null, defaults = {};

  async function fetchJson(path) { const r = await fetch(path); if (!r.ok) throw new Error('Failed to load ' + path); return r.json(); }

  async function load(trackId) {
    if (!journey) journey = await fetchJson('/data/content/journey.json');
    if (!mindset) mindset = await fetchJson('/data/content/mindset.json');
    defaults = (journey.meta && journey.meta.defaultTerms) || {};
    const id = trackId || (window.Store && Store.getTrack && Store.getTrack()) || 'ministry';
    track = await fetchJson(`/data/tracks/${id}.json`);
    return track;
  }

  const trackId = () => (track && track.id) || 'ministry';

  // Apply a per-track variant override (shallow merge of provided keys, with a
  // deep merge for the steps array by step id).
  function applyVariant(obj) {
    if (!obj || !obj.variants || !obj.variants[trackId()]) return obj;
    const v = obj.variants[trackId()];
    const out = Object.assign({}, obj, v);
    if (v.steps && Array.isArray(obj.steps)) {
      out.steps = obj.steps.map((s) => {
        const ov = v.steps.find((x) => x.id === s.id);
        return ov ? Object.assign({}, s, ov) : s;
      });
    }
    delete out.variants;
    return out;
  }

  // Replace {{token}} with the track's term (falling back to journey defaults).
  function t(str) {
    if (str == null) return str;
    const terms = Object.assign({}, defaults, (track && track.terms) || {});
    return String(str).replace(/\{\{([a-zA-Z]+)\}\}/g, (m, k) => (terms[k] != null && terms[k] !== '' ? terms[k] : (defaults[k] != null ? defaults[k] : k)));
  }
  const faith = () => !!(track && track.faith);

  function lensExercise(ex) {
    let out = applyVariant(JSON.parse(JSON.stringify(ex)));
    out.title = t(out.title);
    out.purpose = t(out.purpose);
    if (out.scripture && !faith()) delete out.scripture;
    else if (out.scripture) out.scripture = out.scripture.map(t);
    (out.steps || []).forEach((s) => {
      s.label = t(s.label); s.prompt = t(s.prompt);
      if (s.example) s.example = t(s.example);
      if (s.leftLabel) s.leftLabel = t(s.leftLabel);
      if (s.rightLabel) s.rightLabel = t(s.rightLabel);
    });
    return out;
  }

  function section(id) {
    const raw = (journey.sections || []).find((x) => x.id === id);
    if (!raw) return null;
    const s = applyVariant(JSON.parse(JSON.stringify(raw)));
    const out = Object.assign({}, s);
    out.title = t(s.title); out.tagline = t(s.tagline); out.intro = t(s.intro);
    if (s.statement) out.statement = t(s.statement);
    out.exercises = (raw.exercises || []).map(lensExercise);
    return out;
  }

  function tabs() {
    return (journey.tabs || [])
      .filter((tb) => !(tb.faithOnly && !faith()))
      .map((tb) => Object.assign({}, tb, { title: t(tb.title), prompt: t(tb.prompt) }));
  }

  function pillars() { return (journey.sections || []).filter((s) => s.kind === 'pillar').map((s) => s.id); }

  function findExercise(exId) {
    for (const s of journey.sections || []) {
      const ex = (s.exercises || []).find((e) => e.id === exId);
      if (ex) return { section: s.id, exercise: lensExercise(ex) };
    }
    return null;
  }

  // Section id → display title (track-aware), for nav labels etc.
  function sectionTitle(id) { const s = section(id); return s ? s.title : id; }

  async function setTrack(id) {
    if (window.Store && Store.setTrack) Store.setTrack(id);
    await load(id);
  }

  return {
    TRACKS, load, setTrack, t, faith,
    track: () => track,
    trackId,
    meta: () => (journey && journey.meta) || {},
    section, sectionTitle,
    sections: () => (journey.sections || []).map((s) => section(s.id)),
    tabs, pillars, findExercise,
    mindset: () => mindset,
  };
})();
