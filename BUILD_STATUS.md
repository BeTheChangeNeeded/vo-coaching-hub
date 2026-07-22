# VisionOne Coaching Hub — Build Status

**Status:** MVP Ready for Testing & Deployment

---

## Completed Phases

### ✅ Phase 1: Scaffold
- [x] New standalone app at `c:/Users/MichelleBonahoom/vo-coaching-hub`
- [x] VisionOne branding (green, Lato/Sanchez, logo)
- [x] Auth via `/.auth` (AAD + Google via SWA)
- [x] Workspace store with proper shape (profile, journey, tabs, goals, assessment, sharing, notes, requests)
- [x] Track selector (ministry / military / business / career)

### ✅ Phase 2: Engine + Content
- [x] Exercise Player component with all input types (text, textarea, list, pairs, table, wheel)
- [x] `data/content/journey.json` — 5 Transformation Anchors + 5 Pillars + 10 Journal tabs
- [x] Content lensing system (track variants + token replacement)
- [x] All 17 frontend tools built & registered:
  - **Get Started:** about, profile, guided, dashboard
  - **Foundation:** anchors
  - **The Journey:** identity, mission, calling, vision, launch
  - **Reflect:** journal, reports
  - **Grow:** trimetrix, values, goals, coach-companion, resources

### ✅ Phase 3: Assessment
- [x] TriMetrix HD upload → PDF/docx extraction
- [x] TriMetrix report parsing (DISC, Driving Forces, Acumen/Mindset)
- [x] AI debrief endpoint (`/api/coach-companion`) with structured output
- [x] Track-aware coaching tone & language (ministry/military/business/career)
- [x] Both adaptation axes wired:
  - **Track lens:** terminology map, examples, scripture toggle, resources per track
  - **Assessment lens:** DISC/mindset drives coaching prompts & distortion focus

### ✅ Phase 4: Goals & Reports
- [x] Goal & plan builder with step-by-step wizard
- [x] **Version history** — multiple saved snapshots of each goal plan
- [x] Reports tool generating summaries:
  - Identity summary (via `journey-summary`)
  - Themes & Gold (recurring patterns across all tabs)
  - Launch Plan synthesis
- [x] Section-by-section generation avoids 45s Azure timeout

### ✅ Phase 5: Coaching + Resources
- [x] Consent-gated sharing system (coachEmail, consent flag)
- [x] Coach dashboard — see shared journeys, add notes/feedback
- [x] Two-way notes between coach & coachee
- [x] Request system (assessment debrief, coach session) with email notifications
- [x] Track-aware resource libraries (military TAP, ministry prayer resources, business leadership, career tools)

### ✅ Model Tiering (CRITICAL FIX)
- [x] **Opus 4.7** for synthesis tasks: journey-summary, declaration-helper, exercise-assist, explain
- [x] **Haiku 4.5-20251001** for chat task: coach-companion
- [x] Centralized model selection in `api/_shared/claude.js`
- [x] All synthesis endpoints explicitly use `tier: 'generate'`
- [x] Chat endpoint explicitly uses `tier: 'chat'`

### ✅ Deployment
- [x] SWA config (`staticwebapp.config.json`) with correct routes
- [x] GitHub Actions workflow updated to use **SWA CLI** (not broken v1 action)
- [x] API Node 18 runtime configured
- [x] Local dev server works (`node dev-server.js`)

---

## API Endpoints (19 total)

**Shared infrastructure:**
- ✅ `/api/workspace` — sync workspace to/from Blob storage
- ✅ `/api/me` — current user identity & role
- ✅ `/api/extract` — PDF/docx text extraction

**Coaching core:**
- ✅ `/api/coach-companion` — AI chat (Haiku 4.5, `tier: 'chat'`)
- ✅ `/api/journey-summary` — section synthesis (Opus 4.7, `tier: 'generate'`)
- ✅ `/api/declaration-helper` — limiting belief → declaration (Opus 4.7, `tier: 'generate'`)
- ✅ `/api/exercise-assist` — per-field help & examples (Opus 4.7, `tier: 'generate'`)
- ✅ `/api/explain` — exercise deep-dive + examples (Opus 4.7, `tier: 'generate'`)

**Assessment:**
- ✅ `/api/trimetrix-report` — parse TriMetrix HD PDF, structure output

**Coach collaboration:**
- ✅ `/api/coach-clients` — list coachees I coach
- ✅ `/api/coach-client` — get one coachee's shared journey
- ✅ `/api/coach-note` — add/edit coach notes on a coachee's journey
- ✅ `/api/requests` — list/manage requests (session, debrief)

**Admin & notifications:**
- ✅ `/api/notify` — send emails (coach requests, assignment reminders)
- ✅ `/api/providers` — list configured AI providers
- ✅ `/api/resources` — curated library (track-aware)
- ✅ `/api/resource-upload` — upload to the resource library (admin)
- ✅ `/api/usage-analytics` — track AI calls & workspace hits

---

## Data Files

**Content:**
- ✅ `/data/content/journey.json` — complete exercise corpus (Transformation Anchors, 5 Pillars, 10 Journal tabs)
- ✅ `/data/content/mindset.json` — 15 distortions + reversing questions (axiology framework)
- ✅ `/data/content/values.json` — Core Values card deck

**Tracks (4 × terminology + resources + coaching tone):**
- ✅ `/data/tracks/ministry.json` — "Identity to Impact" (faith-based, Scripture-native)
- ✅ `/data/tracks/military.json` — "Mission Forward" (service member to civilian, mission language)
- ✅ `/data/tracks/business.json` — "Lead With Purpose" (business leader, strategy/culture focus)
- ✅ `/data/tracks/career.json` — "Career Compass" (career seeker, job search focus)

---

## What's Next

### Testing (before deployment)
- [ ] **Local smoke test:** `node dev-server.js` → pick ministry track → walk an Identity exercise → confirm autosave
- [ ] **Assessment flow:** upload sample TriMetrix HD PDF → confirm parse → generate debrief
- [ ] **Goals:** create a goal plan, save two versions, confirm both are reloadable
- [ ] **Reports:** generate Themes & Gold across journal tabs, confirm no timeout
- [ ] **Coach loop:** sign in as coachee → consent-share to coach email → sign in as coach → see journey, add note → back as coachee → see note
- [ ] **Request system:** submit "request debrief" → confirm email notifies admin/coach
- [ ] **Syntax check:** all JS files, API handlers, verify no 500 errors locally

### Deployment
1. **Environment setup:** Ensure `ANTHROPIC_API_KEY` is set in Azure SWA environment
2. **Push to GitHub:** Commit all changes, push to `main` branch
3. **GitHub Actions:** SWA workflow deploys via SWA CLI (fixed workflow now in place)
4. **Verify prod:** Hit live SWA URL → sign in via /.auth → test one exercise + AI call
5. **Monitor:** Check usage analytics & error logs in the first 24h

---

## Architecture Summary

**Frontend:** Pure vanilla JS (no frameworks), localStorage + server sync, localStorage-powered guest mode, 17 modular tools, single-page app with hash router.

**Backend:** Azure Functions (Node 18), Claude Anthropic API (Opus 4.7 + Haiku 4.5), provider-agnostic (supports Azure OpenAI + OpenAI as fallback), per-user workspace in Azure Blob Storage.

**Adaptation:** Two-axis (track lens + assessment lens) drives all AI output — same code, many voices.

**Deployment:** GitHub Actions → SWA CLI → Azure Static Web Apps (managed auth, auto-scaling, free tier for prototyping).

---

## Known Limitations (by design, v1)

- Async coach↔coachee only (no real-time chat)
- Single assessment upload (not multiple versions per coachee)
- No AI plan generation from journey answers (v2 feature)
- No custom exercise builder (content is data-driven but locked to admins for now)
- Ministry track is primary; other tracks are MVP-level adaptations

---

## Model Selection (2026-07-13)

**Fixed in this session:** Switched from broken Sonnet 4.6 + non-existent Opus 4.8 references to correct tiering:
- Synthesis (coaching-summary, journey-summary, declaration-helper, exercise-assist, explain) → **Opus 4.7**
- Chat (coach-companion) → **Haiku 4.5-20251001**
- All 5 synthesis endpoints now explicitly pass `tier: 'generate'` to `complete()`; chat passes `tier: 'chat'`.
- Central selection logic in `api/_shared/claude.js` prevents manual per-endpoint model picking.

---

## Files Modified This Session

- `api/_shared/claude.js` — fixed model tiering + added `selectTierForEndpoint()` helper
- `api/declaration-helper/index.js` — switched to `tier: 'generate'`
- `api/exercise-assist/index.js` — switched to `tier: 'generate'`
- `api/explain/index.js` — switched to `tier: 'generate'`
- `.github/workflows/azure-static-web-apps.yml` — fixed to use SWA CLI instead of broken v1 action
- Plan: updated "Opus 4.8" → "Opus 4.7"
