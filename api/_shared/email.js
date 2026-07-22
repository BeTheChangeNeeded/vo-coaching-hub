// Azure-native email via Azure Communication Services (ACS) Email.
// One sender for the whole platform. If ACS isn't configured (local dev without
// a connection string), it logs the message instead of throwing — so the rest of
// the app keeps working and you can wire the real resource later.
//
// Setup in Azure:
//   1. Create an Azure Communication Services resource + an Email Communication
//      Service with a verified sender domain.
//   2. Set app settings: ACS_CONNECTION_STRING and ACS_SENDER (e.g.
//      "DoNotReply@<your-verified-domain>").

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// ACS Email is called over its REST API with HMAC auth (node https+crypto, no
// @azure SDK — the SDK requires Node 20+ and SWA managed functions run Node 18).
const ACS_API_VERSION = '2023-03-31';
function parseAcs(conn) {
  const parts = {};
  String(conn || '').split(';').forEach((kv) => { const i = kv.indexOf('='); if (i > 0) parts[kv.slice(0, i)] = kv.slice(i + 1); });
  return { endpoint: (parts.endpoint || '').replace(/\/$/, ''), key: parts.accesskey };
}
function acsSend(conn, message) {
  const { endpoint, key } = parseAcs(conn);
  const body = JSON.stringify(message);
  const url = new URL(endpoint + '/emails:send?api-version=' + ACS_API_VERSION);
  const contentHash = crypto.createHash('sha256').update(body, 'utf8').digest('base64');
  const date = new Date().toUTCString();
  const host = url.host;
  const stringToSign = `POST\n${url.pathname}${url.search}\n${date};${host};${contentHash}`;
  const signature = crypto.createHmac('sha256', Buffer.from(key, 'base64')).update(stringToSign, 'utf8').digest('base64');
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'x-ms-date': date,
    'x-ms-content-sha256': contentHash,
    Authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
  };
  return new Promise((resolve, reject) => {
    const r = https.request({ method: 'POST', hostname: url.hostname, path: url.pathname + url.search, headers }, (res) => {
      let d = ''; res.on('data', (c) => { d += c; }); res.on('end', () => resolve({ status: res.statusCode, body: d, opLocation: res.headers['operation-location'] }));
    });
    r.on('error', reject); r.write(body); r.end();
  });
}

// Load the VisionOne logo once for inline (cid) embedding in branded emails.
let LOGO_B64;
function logoBase64() {
  if (LOGO_B64 !== undefined) return LOGO_B64 || null;
  try { LOGO_B64 = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'img', 'visionone-logo-color.png')).toString('base64'); }
  catch { LOGO_B64 = ''; }
  return LOGO_B64 || null;
}

function brandWrap({ tenantName = 'VisionOne Career Hub', primary = '#649954', title, bodyHtml }) {
  const hasLogo = !!logoBase64();
  const header = hasLogo
    ? `<div style="background:#fff;border:1px solid #e2e8f0;border-bottom:none;border-radius:16px 16px 0 0;padding:20px 26px;text-align:center">
         <img src="cid:vologo" alt="${tenantName}" style="height:48px;width:auto;display:inline-block" /></div>
       <div style="height:4px;background:${primary};margin:0"></div>`
    : `<div style="background:${primary};color:#fff;border-radius:16px 16px 0 0;padding:22px 26px;font-weight:700;font-size:16px">${tenantName}</div>`;
  return `<!DOCTYPE html><html><body style="margin:0;background:#f5f7f5;font-family:'Segoe UI',Arial,sans-serif;color:#1f2937">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    ${header}
    <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:26px">
      <h1 style="font-size:20px;margin:0 0 14px;color:#1f2937">${title}</h1>
      ${bodyHtml}
      <p style="color:#64748b;font-size:12px;margin-top:26px;line-height:1.5">
        You're receiving this because you use ${tenantName}. AI outputs are guidance, not guarantees.
      </p>
    </div>
  </div></body></html>`;
}

// attachments: optional [{ name, contentType, base64 }]
async function sendEmail({ to, subject, html, attachments, context }) {
  const conn = process.env.ACS_CONNECTION_STRING;
  const sender = process.env.ACS_SENDER;
  const log = (context && context.log) || console;

  if (!conn || !sender) {
    log.warn?.(`[email] ACS not configured — would send to ${to}: "${subject}"${attachments?.length ? ` (+${attachments.length} attachment)` : ''}`);
    return { sent: false, reason: 'acs-not-configured' };
  }

  const atts = [];
  // Inline logo (referenced as cid:vologo in branded HTML).
  const logo = logoBase64();
  if (logo && html && html.includes('cid:vologo')) {
    atts.push({ name: 'logo.png', contentType: 'image/png', contentInBase64: logo, contentId: 'vologo' });
  }
  (attachments || []).forEach((a) => atts.push({
    name: a.name, contentType: a.contentType || 'application/octet-stream', contentInBase64: a.base64,
  }));

  const message = {
    senderAddress: sender,
    content: { subject, html },
    recipients: { to: [{ address: to }] },
  };
  if (atts.length) message.attachments = atts;

  const res = await acsSend(conn, message);
  if (res.status === 202 || res.status === 200) return { sent: true, status: 'Queued', opLocation: res.opLocation };
  log.error?.(`[email] ACS send failed ${res.status}: ${String(res.body).slice(0, 300)}`);
  return { sent: false, reason: `acs-${res.status}`, detail: String(res.body).slice(0, 300) };
}

module.exports = { sendEmail, brandWrap };
