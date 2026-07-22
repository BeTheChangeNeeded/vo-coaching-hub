// Shared workspace store + auth helpers.
//
// Talks to Azure Blob Storage over the REST API with Shared Key auth using only
// Node's built-in https + crypto — NO @azure/* SDK. (The Azure SDKs now require
// Node 20+, but SWA managed functions run Node 18, so the SDKs crash there.)
//
// - Each user's workspace is one JSON blob: ws__{b64url(userId)}.json
// - Coaches are an admin allowlist (COACH_EMAILS).
// - A client shares by consent: workspace.sharing = {consent, coachEmail}. When on,
//   we write a share-pointer blob share__{b64url(coachEmail)}__{b64url(userId)}.json
//   so a coach can list their clients. Read access is re-checked against the
//   client's live consent on every coach read.
const https = require('https');
const crypto = require('crypto');

// Dedicated container so Coaching Hub data stays isolated from other apps that
// may share the same storage account.
const CONTAINER = 'coachingworkspaces';
const API_VERSION = '2021-08-06';

function configured() { return !!process.env.WORKSPACE_STORAGE; }

// ---- identity / roles ----
function principal(req) {
  const h = req.headers && (req.headers['x-ms-client-principal'] || req.headers['X-MS-CLIENT-PRINCIPAL']);
  if (!h) return null;
  try { const p = JSON.parse(Buffer.from(h, 'base64').toString('utf8')); return p && p.userId ? p : null; }
  catch { return null; }
}
function emailOf(p) { return (p && p.userDetails ? String(p.userDetails) : '').trim().toLowerCase(); }
function coachList() { return String(process.env.COACH_EMAILS || '').split(/[;,]/).map((s) => s.trim().toLowerCase()).filter(Boolean); }
function isCoach(email) { return !!email && coachList().includes(String(email).trim().toLowerCase()); }
function adminList() { return String(process.env.ADMIN_EMAILS || '').split(/[;,]/).map((s) => s.trim().toLowerCase()).filter(Boolean); }
function isAdmin(email) { return !!email && adminList().includes(String(email).trim().toLowerCase()); }
// Admins are also treated as coaches (can view shared journeys).
function roleOf(email) { if (isAdmin(email)) return 'admin'; if (isCoach(email)) return 'coach'; return 'coachee'; }

// ---- blob naming (url-safe, no slashes/@ so signing stays simple) ----
function b64url(s) { return Buffer.from(String(s), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function wsBlob(userId) { return `ws__${b64url(userId)}.json`; }
function shareBlob(coachEmail, userId) { return `share__${b64url(String(coachEmail).toLowerCase())}__${b64url(userId)}.json`; }
function sharePrefix(coachEmail) { return `share__${b64url(String(coachEmail).toLowerCase())}__`; }

// ---- REST plumbing (Shared Key auth) ----
function conn() {
  const cs = process.env.WORKSPACE_STORAGE || '';
  const parts = {};
  cs.split(';').forEach((kv) => { const i = kv.indexOf('='); if (i > 0) parts[kv.slice(0, i)] = kv.slice(i + 1); });
  const account = parts.AccountName;
  return { account, key: parts.AccountKey, endpoint: (parts.BlobEndpoint || `https://${account}.blob.core.windows.net`).replace(/\/$/, '') };
}

function authHeader(method, c, pathAndQuery, headers, contentLength) {
  const xms = Object.keys(headers).filter((h) => h.toLowerCase().startsWith('x-ms-')).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const canonHeaders = xms.map((h) => `${h.toLowerCase()}:${headers[h]}`).join('\n');
  const qi = pathAndQuery.indexOf('?');
  const path = qi === -1 ? pathAndQuery : pathAndQuery.slice(0, qi);
  const query = qi === -1 ? '' : pathAndQuery.slice(qi + 1);
  let canonResource = `/${c.account}${path}`;
  if (query) {
    const params = {};
    query.split('&').forEach((p) => { const eq = p.indexOf('='); const k = decodeURIComponent(p.slice(0, eq)).toLowerCase(); params[k] = decodeURIComponent(p.slice(eq + 1)); });
    Object.keys(params).sort().forEach((k) => { canonResource += `\n${k}:${params[k]}`; });
  }
  const stringToSign = [
    method, headers['Content-Encoding'] || '', headers['Content-Language'] || '', contentLength === 0 ? '' : String(contentLength || ''),
    headers['Content-MD5'] || '', headers['Content-Type'] || '', '', // Date via x-ms-date
    headers['If-Modified-Since'] || '', headers['If-Match'] || '', headers['If-None-Match'] || '', headers['If-Unmodified-Since'] || '', headers['Range'] || '',
    canonHeaders + '\n' + canonResource,
  ].join('\n');
  const sig = crypto.createHmac('sha256', Buffer.from(c.key, 'base64')).update(stringToSign, 'utf8').digest('base64');
  return `SharedKey ${c.account}:${sig}`;
}

function req(method, pathAndQuery, body, extra) {
  const c = conn();
  const bodyBuf = body == null ? null : (Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8'));
  const headers = Object.assign({ 'x-ms-date': new Date().toUTCString(), 'x-ms-version': API_VERSION }, extra || {});
  if (bodyBuf) headers['Content-Length'] = bodyBuf.length;
  headers['Authorization'] = authHeader(method, c, pathAndQuery, headers, bodyBuf ? bodyBuf.length : 0);
  const u = new URL(c.endpoint + pathAndQuery);
  return new Promise((resolve, reject) => {
    const r = https.request({ method, hostname: u.hostname, path: u.pathname + u.search, headers }, (res) => {
      const chunks = []; res.on('data', (x) => chunks.push(x)); res.on('end', () => { const buf = Buffer.concat(chunks); resolve({ status: res.statusCode, buffer: buf, body: buf.toString('utf8'), headers: res.headers }); });
    });
    r.on('error', reject); if (bodyBuf) r.write(bodyBuf); r.end();
  });
}

async function ensureContainer() {
  const r = await req('PUT', `/${CONTAINER}?restype=container`);
  if (r.status !== 201 && r.status !== 409) { /* 409 = already exists */ if (r.status >= 400) throw new Error('container create ' + r.status); }
}
async function getBlobText(name) {
  const r = await req('GET', `/${CONTAINER}/${name}`);
  if (r.status === 404) return null;
  if (r.status >= 400) throw new Error('blob get ' + r.status + ' ' + r.body.slice(0, 200));
  return r.body;
}
async function putBlobText(name, text) {
  const r = await req('PUT', `/${CONTAINER}/${name}`, text, { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': 'application/json' });
  if (r.status >= 400) throw new Error('blob put ' + r.status + ' ' + r.body.slice(0, 200));
}
async function putBlobBin(name, buffer, contentType) {
  await ensureContainer();
  const r = await req('PUT', `/${CONTAINER}/${name}`, buffer, { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': contentType || 'application/octet-stream' });
  if (r.status >= 400) throw new Error('blob put ' + r.status);
}
async function getBlobBin(name) {
  const r = await req('GET', `/${CONTAINER}/${name}`);
  if (r.status === 404) return null;
  if (r.status >= 400) throw new Error('blob get ' + r.status);
  return { buffer: r.buffer, contentType: (r.headers && r.headers['content-type']) || 'application/octet-stream' };
}
async function delBlob(name) { try { await req('DELETE', `/${CONTAINER}/${name}`); } catch (e) { /* ignore */ } }
async function listNames(prefix) {
  const r = await req('GET', `/${CONTAINER}?restype=container&comp=list&prefix=${encodeURIComponent(prefix)}`);
  if (r.status >= 400) return [];
  const names = []; const re = /<Name>([^<]+)<\/Name>/g; let m;
  while ((m = re.exec(r.body))) names.push(m[1]);
  return names;
}

// ---- high-level doc API (same interface the functions used before) ----
async function readDoc(userId) {
  const t = await getBlobText(wsBlob(userId));
  if (t == null) return null;
  try { return JSON.parse(t); } catch { return null; }
}
async function writeDoc(userId, doc) { await putBlobText(wsBlob(userId), JSON.stringify(doc)); }

// Shared app-data blobs (e.g. the curated resources list), by literal name.
async function readJson(name) { const t = await getBlobText(name); if (t == null) return null; try { return JSON.parse(t); } catch { return null; } }
async function writeJson(name, obj) { await ensureContainer(); await putBlobText(name, JSON.stringify(obj)); }

async function reconcileShare({ userId, name, email, prevCoachEmail, sharing }) {
  const wantCoach = sharing && sharing.consent && sharing.coachEmail ? String(sharing.coachEmail).trim().toLowerCase() : null;
  if (prevCoachEmail && prevCoachEmail !== wantCoach) await delBlob(shareBlob(prevCoachEmail, userId));
  if (wantCoach) await putBlobText(shareBlob(wantCoach, userId), JSON.stringify({ userId, name: name || '', email: email || '', sharedAt: new Date().toISOString() }));
}

// All user workspaces (for the weekly nudge cron). Returns [{ workspace, email }].
async function listWorkspaces() {
  const names = await listNames('ws__');
  const out = [];
  for (const n of names) {
    try { const t = await getBlobText(n); if (t) { const d = JSON.parse(t); out.push({ workspace: d.workspace || {}, email: (d.user && d.user.details) || '', updatedAt: d.updatedAt || null }); } }
    catch (e) { /* skip */ }
  }
  return out;
}

async function listClientsForCoach(coachEmail) {
  const names = await listNames(sharePrefix(coachEmail));
  const out = [];
  for (const n of names) {
    try { const t = await getBlobText(n); if (t) out.push(JSON.parse(t)); } catch (e) { /* skip */ }
  }
  return out;
}

module.exports = { configured, principal, emailOf, isCoach, isAdmin, roleOf, ensureContainer, readDoc, writeDoc, readJson, writeJson, putBlobBin, getBlobBin, reconcileShare, listClientsForCoach, listWorkspaces };
