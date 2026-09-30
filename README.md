# Cliente de la API de Higgsfield

Cliente mínimo en Node (sin dependencias) para llamar directamente a
`platform.higgsfield.ai`, usando como referencia
[wide-trace/open-higgsfield](https://github.com/wide-trace/open-higgsfield)
(`src/generation/platform.ts`, `poll.ts`, `to-platform.ts` y el catálogo).

## Configuración

```bash
cp .env.example .env   # y pon tu clave id:secret en HF_API_KEY
node src/cli.js check  # comprueba la clave sin gastar créditos
```

`.env` está en `.gitignore`: la clave nunca se sube al repositorio.

## Cómo funciona la API

| Acción | Petición |
| --- | --- |
| Encolar | `POST https://platform.higgsfield.ai/{ruta-del-modelo}` con JSON → `{ request_id, status, status_url, cancel_url }` |
| Estado | `GET https://platform.higgsfield.ai/requests/{request_id}/status` → `{ status, images?: [{url}], video?: {url}, error? }` |
| Subir archivo | `POST /files/generate-upload-url` con `{content_type}` → `{ public_url, upload_url, upload_headers }`; luego `PUT` del archivo a `upload_url` |
| Auth | Cabecera `Authorization: Key <id>:<secret>` |

Origen documentado: `https://api.higgsfield.ai` ([docs.higgsfield.ai](https://docs.higgsfield.ai/docs)); `platform.higgsfield.ai` responde igual.

Estados terminales: `completed`, `failed`, `nsfw`, `canceled`. open-higgsfield consulta cada 4 s con un límite de 10 min.

## CLI

```bash
node src/cli.js models                        # alias → ruta de la plataforma
node src/cli.js generate soul-2 "retrato de producto sobre mármol" --aspect_ratio 9:16 --resolution 1080p
node src/cli.js generate kling-3-turbo "zoom lento" \
  --path kling-video/v3.0-turbo/image-to-video --image_url https://... --duration 5
node src/cli.js submit soul-2 '{"prompt":"..."}'   # solo encola
node src/cli.js status <request_id>
node src/cli.js wait <request_id>
```

**Genjutsu** (vídeo de referencia de 4–30 s + 1–8 imágenes, `resolution` 480p/720p/1080p, prompt opcional):

```bash
node src/cli.js generate genjutsu-swap "cambia la botella por mi producto" --video_url clip.mp4 --image_urls producto.jpg
node src/cli.js generate genjutsu-motion "" --video_url baile.mp4 --image_urls persona.jpg,ropa.png
```

Los campos `*_url` / `*_urls` aceptan rutas de archivos locales (jpg, png, webp, gif, wav, mp4): se suben
solos y se sustituyen por su URL pública. `node src/cli.js upload <archivo>` sube uno y muestra la URL.

`generate` encola, espera y descarga los resultados en `out/` (cambia con `--out`).
Cualquier `--campo valor` se envía tal cual en el cuerpo JSON. `HF_DEBUG=1` muestra peticiones y respuestas.

Campos habituales (según open-higgsfield):

- **Soul** (`soul-2`, `soul-cinema`): `prompt`, `aspect_ratio`, `resolution` (`720p`/`1080p`), `batch_size` (1 o 4), `enhance_prompt`.
- **Kling 3**: `prompt`, `duration`, `aspect_ratio` (texto) o `image_url` / `last_image_url` (imagen), `sound` (`on`/`off`), `cfg_scale`, `multi_shots`.
- **Seedance**: `prompt`, `resolution`, `duration`, `generate_audio`, `aspect_ratio`; `image_url`/`end_image_url` en `/image-to-video`; `image_urls`/`video_urls`/`audio_urls` en `/reference-to-video`.
- **Resto**: `prompt`, `aspect_ratio`, `resolution`, `duration`, y según la ruta `image_url`, `first_frame_url`/`last_frame_url` o `image_urls`.

Las entradas pueden ser URLs públicas o archivos locales (se suben automáticamente).

## Como librería

```js
import { createClient, outputUrls } from "./src/higgsfield.js";

const hf = createClient({ apiKey: process.env.HF_API_KEY });
const result = await hf.generate("higgsfield-ai/soul/v2/standard", { prompt: "...", aspect_ratio: "1:1" });
console.log(outputUrls(result));
```
