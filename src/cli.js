#!/usr/bin/env node
// CLI para la API de Higgsfield. La clave se lee de HF_API_KEY (o del archivo .env).
//
//   node src/cli.js models
//   node src/cli.js check
//   node src/cli.js generate soul-2 "a cat astronaut" --aspect_ratio 9:16 --resolution 1080p
//   node src/cli.js generate kling-3-turbo "..." --image_url https://... --path kling-video/v3.0-turbo/image-to-video
//   node src/cli.js generate genjutsu-swap "cambia la botella por mi producto" --video_url clip.mp4 --image_urls producto.jpg
//   node src/cli.js upload <archivo>
//   node src/cli.js submit <modelo> '<json>'
//   node src/cli.js status <request_id>
//   node src/cli.js wait <request_id>

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

import { createClient, outputUrls } from "./higgsfield.js";
import { MODELS, IMAGE_MODELS, resolveModel } from "./models.js";

if (existsSync(".env")) process.loadEnvFile(".env");

const [command, ...args] = process.argv.slice(2);

function client() {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) throw new Error("Falta HF_API_KEY (ponla en .env o en el entorno)");
  return createClient({
    apiKey,
    baseUrl: process.env.HF_API_BASE_URL || undefined,
    debug: Boolean(process.env.HF_DEBUG),
  });
}

/** "--clave valor" -> { clave: valor }, convirtiendo números, booleanos y JSON. */
function parseFlags(list) {
  const flags = {};
  for (let i = 0; i < list.length; i++) {
    const arg = list[i];
    if (!arg.startsWith("--")) throw new Error(`Argumento inesperado: ${arg}`);
    const key = arg.slice(2);
    const next = list[i + 1];
    if (next === undefined || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    i++;
    flags[key] = coerce(next);
  }
  return flags;
}

function coerce(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (/^[[{]/.test(value)) {
    try {
      return JSON.parse(value);
    } catch {}
  }
  return value;
}

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
};

async function uploadFile(c, file) {
  const contentType = CONTENT_TYPES[extname(file).toLowerCase()];
  if (!contentType) throw new Error(`Tipo de archivo no admitido: ${file} (usa jpg, png, webp, gif, wav o mp4)`);
  const url = await c.upload(readFileSync(file), contentType);
  console.error(`Subido ${file} -> ${url}`);
  return url;
}

/** Campos *_url / *_urls: las rutas a archivos locales se suben y se sustituyen por su URL pública.
    Varios archivos en un campo *_urls se separan con comas. */
async function uploadLocalFiles(c, input) {
  const resolve = (value) => (typeof value === "string" && !/^https?:\/\//.test(value) && existsSync(value) ? uploadFile(c, value) : value);
  for (const [key, value] of Object.entries(input)) {
    if (key.endsWith("_urls")) {
      const list = Array.isArray(value) ? value : String(value).split(",").map((item) => item.trim()).filter(Boolean);
      input[key] = await Promise.all(list.map(resolve));
    } else if (key.endsWith("_url")) {
      input[key] = await resolve(value);
    }
  }
  return input;
}

async function download(urls, dir) {
  mkdirSync(dir, { recursive: true });
  const saved = [];
  for (const url of urls) {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`No se pudo descargar ${url} (${response.status})`);
      continue;
    }
    const name = basename(new URL(url).pathname) || `output-${Date.now()}`;
    const file = join(dir, name);
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    saved.push(file);
  }
  return saved;
}

function progress(state) {
  console.error(`  estado: ${state.status}`);
}

async function main() {
  switch (command) {
    case "models": {
      for (const [alias, path] of Object.entries(MODELS)) {
        console.log(`${alias in IMAGE_MODELS ? "img" : "vid"}  ${alias.padEnd(24)} ${path}`);
      }
      return;
    }
    case "check": {
      // Consulta un ID inexistente: 404 = clave válida, 401 = clave inválida. No gasta créditos.
      try {
        await client().status("00000000-0000-0000-0000-000000000000");
      } catch (err) {
        if (err.status === 404) return console.log("Clave válida ✔");
        if (err.status === 401 || err.status === 403) throw new Error(`Clave rechazada: ${err.message}`);
        throw err;
      }
      return;
    }
    case "upload": {
      if (!args[0]) throw new Error("Uso: upload <archivo>");
      console.log(await uploadFile(client(), args[0]));
      return;
    }
    case "submit": {
      const [model, json = "{}"] = args;
      console.log(JSON.stringify(await client().submit(resolveModel(model), JSON.parse(json)), null, 2));
      return;
    }
    case "status": {
      console.log(JSON.stringify(await client().status(args[0]), null, 2));
      return;
    }
    case "wait": {
      const result = await client().wait(args[0], { onUpdate: progress });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case "generate": {
      const [model, prompt, ...rest] = args;
      if (!model || prompt === undefined) throw new Error('Uso: generate <modelo> "<prompt>" [--campo valor ...]  (prompt puede ser "")');
      const { path, out = "out", ...input } = parseFlags(rest);
      const target = typeof path === "string" ? path : resolveModel(model);
      const c = client();
      await uploadLocalFiles(c, input);
      const queued = await c.submit(target, { ...(prompt ? { prompt } : {}), ...input });
      console.error(`Encolado ${queued.request_id} en ${target}`);
      const result = await c.wait(queued.request_id, { onUpdate: progress });
      if (result.status !== "completed") {
        console.log(JSON.stringify(result, null, 2));
        process.exitCode = 1;
        return;
      }
      const urls = outputUrls(result);
      urls.forEach((url) => console.log(url));
      for (const file of await download(urls, out)) console.error(`Guardado: ${file}`);
      return;
    }
    default:
      console.log(`Comandos: models | check | upload <archivo> | generate <modelo> "<prompt>" [--campo valor] | submit <modelo> '<json>' | status <id> | wait <id>`);
      if (command) process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  if (err.body && typeof err.body === "object") console.error(JSON.stringify(err.body));
  process.exitCode = 1;
});
