# VisionOne Coaching Hub

A guided coaching platform that walks a person **in transition** from *who they are* to *the impact they'll make* — Identity → Purpose/Mission → Calling → Vision → Launch — with a coach alongside them.

Built on VisionOne's existing stack (Azure Static Web Apps + Azure Functions + Azure Blob), and modeled on the **Career Hub** (`vo-career-intelligence`), reusing its provider-agnostic Claude layer, file extraction, consent-gated coach↔coachee sharing, and workspace sync.

## What it does
- **The Journey** — a data-driven engine renders the *Identity to Impact / Legacy Discovery Journal*: Transformation Anchors, the 5 pillars, and 10 reflective journal tabs. Every exercise autosaves.
- **TriMetrix HD** (primary assessment) — upload the TTI report for an AI **coaching debrief**; results personalize the whole journey.
- **Goals & Plans** — build a plan and save **multiple versions** with history/restore.
- **AI Coach Companion** — chat grounded in the coachee's track, journey, and assessment.
- **Reports** — AI syntheses (Identity summary, full Journey summary, Themes & Gold), generated section-by-section.
- **Coach loop** — consent-gated sharing, coach notes/assignments, and requests (new assessment / debrief / session).

## Two adaptation axes (the "adaptive learning" principles)
1. **Track / version lens** — the same core journey adapts language, examples, scripture, and resources for **Ministry** (Identity to Impact), **Military transition** (Mission Forward), or **Business leader** (Lead With Purpose). Add a track by dropping a file in `data/tracks/`.
2. **Assessment lens** — TriMetrix HD (DISC + Driving Forces + axiology/mindset) adapts coaching tone, prompts, and which of the 15 thinking-distortions to surface.

## Structure
```
index.html                     app shell
assets/js/content.js           content + track-lens engine
assets/js/exercise.js          reusable Exercise Player (autosave + AI assist)
assets/js/store.js             workspace store (localStorage + /api/workspace sync)
assets/js/tools/*.js           one file per tool (auto-register into nav)
data/content/journey.json      the 5 pillars + anchors + tabs (from the journal)
data/content/mindset.json      TriMetrix axiology + 15 distortions
data/tracks/*.json             track lens overlays
api/*/index.js                 Azure Functions (AI + coach + workspace)
api/_shared/*                  claude.js, coaching-prompts.js, wsstore.js, email, extract
```

## Run locally
```bash
node dev-server.js            # serves static + runs api handlers on http://localhost:4280
```
The journey, journal, goals, and dashboard work fully offline (localStorage). AI features need:
```bash
cd api && npm install
# add to api/local.settings.json → "Values": { "ANTHROPIC_API_KEY": "sk-ant-..." }
```
Default models: **Claude Opus/Sonnet** for synthesis, **Haiku** for chat (see `api/_shared/claude.js`).

## Deploy
Azure Static Web App (own resource). Auth via `/.auth` (Microsoft AAD + Google) — set `AAD_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `ANTHROPIC_API_KEY`, and (for storage) `AZURE_STORAGE_CONNECTION_STRING` in the SWA config. Coaches are listed via the `COACH_EMAILS` app setting; request emails via ACS (`ACS_CONNECTION_STRING`, `ACS_SENDER`, `COACH_REQUESTS_TO`).
