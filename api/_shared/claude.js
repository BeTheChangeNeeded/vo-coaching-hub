// AI provider layer for the Career Hub Platform.
//
// Provider-agnostic: every tool calls complete() / completeJSON() and never
// touches a vendor SDK directly. Supports THREE providers so they can be A/B'd:
//   - "azure"     → Azure OpenAI (deployed via Azure AI Foundry)
//   - "anthropic" → Claude (direct Anthropic API)
//   - "openai"    → OpenAI (direct OpenAI API)
//
// Each request may pass { provider } to pick one; otherwise the default is
// AI_PROVIDER, or the first provider that has credentials configured.
//
// Task tiers ("generate" = quality work, "chat" = cheap/fast) map to a model
// (Anthropic/OpenAI) or a deployment name (Azure).

let Anthropic; try { Anthropic = require('@anthropic-ai/sdk'); } catch { /* optional */ }
let OpenAILib; try { OpenAILib = require('openai'); } catch { /* optional */ }

function fail(msg, code = 500) { const e = new Error(msg); e.statusCode = code; return e; }

// ---------- model / deployment maps ----------
const ANTHROPIC_MODELS = { generate: 'claude-opus-4-7', chat: 'claude-haiku-4-5-20251001' };
const OPENAI_MODELS = {
  generate: process.env.OPENAI_MODEL || 'gpt-4.1',
  chat: process.env.OPENAI_MODEL_FAST || 'gpt-4.1-mini',
};
function azureDeployment(tier) {
  const main = process.env.AZURE_OPENAI_DEPLOYMENT;
  const fast = process.env.AZURE_OPENAI_DEPLOYMENT_FAST || main;
  return tier === 'chat' ? fast : main;
}

// ---------- which providers are usable ----------
const PROVIDERS = {
  azure: {
    label: 'GPT-4.1 · Azure AI Foundry',
    configured: () => !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY),
  },
  anthropic: {
    label: 'Claude Opus 4.7 (synthesis) / Haiku 4.5 (chat) · Anthropic',
    configured: () => !!process.env.ANTHROPIC_API_KEY,
  },
  openai: {
    label: 'GPT-4.1 · OpenAI',
    configured: () => !!process.env.OPENAI_API_KEY,
  },
};

function listProviders() {
  return Object.entries(PROVIDERS).map(([id, p]) => ({ id, label: p.label, configured: p.configured() }));
}
function defaultProvider() {
  if (process.env.AI_PROVIDER && PROVIDERS[process.env.AI_PROVIDER]) return process.env.AI_PROVIDER;
  const firstReady = Object.keys(PROVIDERS).find((id) => PROVIDERS[id].configured());
  return firstReady || 'azure';
}
function resolveProvider(requested) {
  if (requested && PROVIDERS[requested] && PROVIDERS[requested].configured()) return requested;
  return defaultProvider();
}

// ---------- OpenAI-shaped backends (Azure + OpenAI share the chat API) ----------
function openaiStyleClient(kind) {
  if (!OpenAILib) throw fail('openai SDK is not installed (run `npm install` in /api).');
  if (kind === 'azure') {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    if (!endpoint || !apiKey) throw fail('AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY must be configured.', 400);
    return new OpenAILib.AzureOpenAI({ endpoint, apiKey, apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21' });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw fail('OPENAI_API_KEY must be configured.', 400);
  return new OpenAILib.OpenAI({ apiKey });
}
function openaiModel(kind, tier) {
  return kind === 'azure' ? azureDeployment(tier) : OPENAI_MODELS[tier] || OPENAI_MODELS.generate;
}
function toOpenAIMessages(system, messages) {
  const out = [];
  if (system) out.push({ role: 'system', content: system });
  (messages || []).forEach((m) => out.push({ role: m.role, content: m.content }));
  return out;
}
async function chatComplete(kind, { tier, system, messages, maxTokens }) {
  const client = openaiStyleClient(kind);
  const resp = await client.chat.completions.create({
    model: openaiModel(kind, tier),
    max_completion_tokens: maxTokens,
    messages: toOpenAIMessages(system, messages),
  });
  return (resp.choices[0].message.content || '').trim();
}
async function chatCompleteJSON(kind, { tier, system, messages, schema, maxTokens }) {
  const client = openaiStyleClient(kind);
  const resp = await client.chat.completions.create({
    model: openaiModel(kind, tier),
    max_completion_tokens: maxTokens,
    messages: toOpenAIMessages(system, messages),
    response_format: { type: 'json_schema', json_schema: { name: 'result', strict: true, schema } },
  });
  const msg = resp.choices[0].message;
  if (msg.refusal) throw fail('The model declined to answer this request.', 422);
  return JSON.parse(msg.content);
}

// ---------- Anthropic backend ----------
function anthropicClient() {
  if (!Anthropic) throw fail('@anthropic-ai/sdk is not installed (run `npm install` in /api).');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw fail('ANTHROPIC_API_KEY is not configured.', 400);
  return new Anthropic({ apiKey });
}
async function anthropicComplete({ tier, system, messages, maxTokens, modelOverride, thinking }) {
  const params = {
    model: modelOverride || ANTHROPIC_MODELS[tier] || ANTHROPIC_MODELS.generate, max_tokens: maxTokens, system, messages,
  };
  if (thinking) params.thinking = thinking;
  const resp = await anthropicClient().messages.create(params);
  if (resp.stop_reason === 'refusal') throw fail('The model declined to answer this request.', 422);
  return resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}
async function anthropicCompleteJSON({ tier, system, messages, schema, maxTokens, modelOverride }) {
  const resp = await anthropicClient().messages.create({
    model: modelOverride || ANTHROPIC_MODELS[tier] || ANTHROPIC_MODELS.generate, max_tokens: maxTokens, system, messages,
    output_config: { format: { type: 'json_schema', schema } },
  });
  if (resp.stop_reason === 'refusal') throw fail('The model declined to answer this request.', 422);
  return JSON.parse(resp.content.find((b) => b.type === 'text').text);
}

// ---------- Task-aware tier selection ----------
// Synthesis tasks need 'generate' tier (Opus); chat needs 'chat' tier (Haiku).
// Endpoints call selectTierForEndpoint(name) or pass { tier: 'chat' } to complete().
function selectTierForEndpoint(endpointName) {
  const chatEndpoints = ['coach-companion'];
  return chatEndpoints.includes(endpointName) ? 'chat' : 'generate';
}

// ---------- public, provider-agnostic API ----------
async function complete(opts) {
  const o = { tier: 'generate', maxTokens: 8000, ...opts };
  const p = resolveProvider(o.provider);
  if (p === 'anthropic') return anthropicComplete(o);
  return chatComplete(p, o);
}
async function completeJSON(opts) {
  const o = { tier: 'generate', maxTokens: 8000, ...opts };
  const p = resolveProvider(o.provider);
  if (p === 'anthropic') return anthropicCompleteJSON(o);
  return chatCompleteJSON(p, o);
}

module.exports = { complete, completeJSON, listProviders, defaultProvider, resolveProvider, selectTierForEndpoint };
