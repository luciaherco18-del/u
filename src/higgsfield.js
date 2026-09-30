// Cliente mínimo para la API de Higgsfield (platform.higgsfield.ai).
// Basado en src/generation/platform.ts y poll.ts de wide-trace/open-higgsfield.
//
//   POST {base}/{model-path}             -> { request_id, status, status_url, cancel_url }
//   GET  {base}/requests/{id}/status     -> { request_id, status, images?: [{url}], video?: {url}, error? }
//
// Autenticación: cabecera "Authorization: Key <id>:<secret>".

export const DEFAULT_BASE_URL = "https://platform.higgsfield.ai";

/** Estados de los que la plataforma ya no sale. */
export const TERMINAL = new Set(["completed", "failed", "nsfw", "canceled"]);

const MODEL_ID = /^[a-z0-9][a-z0-9._/-]*$/i;

export class PlatformError extends Error {
  constructor(status, body) {
    const detail = body && typeof body === "object" ? body.detail : undefined;
    super(typeof detail === "string" && detail ? detail : `Platform request failed (${status})`);
    this.name = "PlatformError";
    this.status = status;
    this.body = body;
  }
}

export function toAuthorizationHeader(apiKey) {
  const key = (apiKey ?? "").trim();
  const colon = key.indexOf(":");
  if (colon <= 0 || colon === key.length - 1) throw new Error("API key must be id:secret");
  return `Key ${key}`;
}

export function createClient({ apiKey, baseUrl = DEFAULT_BASE_URL, fetch: fetchImpl = fetch, debug = false } = {}) {
  const base = baseUrl.replace(/\/$/, "");
  const auth = toAuthorizationHeader(apiKey);

  async function send(method, path, body) {
    const url = `${base}${path}`;
    if (debug) console.error("[higgsfield] →", method, url, body ?? "");
    const response = await fetchImpl(url, {
      method,
      headers: { Authorization: auth, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }
    if (debug) console.error("[higgsfield] ←", response.status, payload);
    if (!response.ok) throw new PlatformError(response.status, payload);
    return payload;
  }

  /** Encola una generación. `model` es la ruta de la plataforma, p.ej. "higgsfield-ai/soul/v2/standard". */
  async function submit(model, input) {
    if (!MODEL_ID.test(model) || model.includes("..")) throw new PlatformError(400, { detail: "Invalid model" });
    const data = await send("POST", `/${model}`, input);
    if (!data?.request_id) throw new PlatformError(502, { detail: "Platform response missing request_id" });
    return data;
  }

  async function status(requestId) {
    if (!requestId) throw new PlatformError(400, { detail: "Missing request id" });
    return send("GET", `/requests/${encodeURIComponent(requestId)}/status`);
  }

  /** Consulta el estado cada `intervalMs` hasta un estado terminal o hasta agotar `timeoutMs`. */
  async function wait(requestId, { intervalMs = 4000, timeoutMs = 10 * 60_000, onUpdate } = {}) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const current = await status(requestId);
      onUpdate?.(current);
      if (TERMINAL.has(current.status)) return current;
      if (Date.now() > deadline) throw new Error(`Timed out waiting for ${requestId}`);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  /** submit + wait. Devuelve el estado final; lanza si no termina en "completed". */
  async function generate(model, input, options) {
    const queued = await submit(model, input);
    const result = await wait(queued.request_id, options);
    if (result.status !== "completed") {
      const err = new Error(`Generation ${result.status}: ${JSON.stringify(result.error ?? null)}`);
      err.result = result;
      throw err;
    }
    return result;
  }

  return { submit, status, wait, generate };
}

/** URLs de salida de un estado completado (imágenes y/o vídeo). */
export function outputUrls(result) {
  const urls = (result.images ?? []).map((image) => image?.url).filter(Boolean);
  if (result.video?.url) urls.push(result.video.url);
  return urls;
}
