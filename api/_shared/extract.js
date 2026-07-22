// Extracts plain text from an uploaded resume / transcript / job description.
// Supports PDF, Word (.docx), and plain text — so users can upload instead of
// pasting. Old binary .doc is not supported (ask for .docx or PDF).
let mammoth; try { mammoth = require('mammoth'); } catch { /* optional */ }
let pdfParse; try { pdfParse = require('pdf-parse'); } catch { /* optional */ }

function fail(msg, code = 400) { const e = new Error(msg); e.statusCode = code; return e; }

async function extractText({ filename, base64, contentType }) {
  if (!base64) throw fail('No file content provided.');
  const buf = Buffer.from(base64, 'base64');
  const ext = (filename || '').toLowerCase().split('.').pop();
  const ct = (contentType || '').toLowerCase();

  if (ext === 'pdf' || ct === 'application/pdf') {
    if (!pdfParse) throw fail('PDF support not installed (run npm install in /api).', 500);
    const d = await pdfParse(buf);
    return (d.text || '').trim();
  }
  if (ext === 'docx' || ct.includes('wordprocessingml')) {
    if (!mammoth) throw fail('Word support not installed (run npm install in /api).', 500);
    const r = await mammoth.extractRawText({ buffer: buf });
    return (r.value || '').trim();
  }
  if (ext === 'txt' || ext === 'md' || ct.startsWith('text/')) {
    return buf.toString('utf8').trim();
  }
  if (ext === 'doc') throw fail('Old .doc files aren\'t supported — please save as .docx or PDF.', 415);
  throw fail('Unsupported file type. Upload a PDF, Word (.docx), or text file.', 415);
}

module.exports = { extractText };
