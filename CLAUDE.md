# Instrucciones para Claude

Este repo es un cliente de la API de Higgsfield (platform.higgsfield.ai). El usuario
lo usa para generar imágenes y vídeos desde el chat: escribe un prompt y espera
recibir el resultado directamente en la conversación.

## Cuando el usuario pida una imagen o un vídeo

1. Comprueba la clave: `node src/cli.js check`. Se lee de la variable de entorno
   `HF_API_KEY` (configurada en el entorno) o de `.env`. Nunca pidas que la peguen en el chat.
2. Genera con el CLI (ver `README.md` para modelos y campos):
   - Imagen por defecto: `node src/cli.js generate soul-2 "<prompt>" --aspect_ratio 1:1 --resolution 720p --batch_size 1`
   - Vídeo por defecto: `node src/cli.js generate kling-3-turbo "<prompt>" --aspect_ratio 9:16 --duration 5 --resolution 720p`
   - Vídeo desde imagen: añade `--path <familia>/image-to-video --image_url <url o archivo local>`.
   - Genjutsu (el usuario lo llama así): `genjutsu-swap` cambia un objeto/producto del vídeo,
     `genjutsu-motion` transfiere el movimiento a sus personajes/ropa/productos.
     `node src/cli.js generate genjutsu-swap "<prompt opcional>" --video_url <mp4 4-30 s> --image_urls <img1>,<img2>`
   - Los campos `*_url`/`*_urls` aceptan archivos locales (p.ej. los que el usuario adjunte en el chat): se suben solos.
   - `node src/cli.js models` lista los alias. Si falla la validación, el mensaje de la API dice qué campo sobra o falta.
3. Los archivos se guardan en `out/` (ignorado por git). Envíalos al usuario con la
   herramienta de enviar archivos para que los vea en el chat, y da también la URL.
4. Si la descarga da 403, es la política de red del entorno: pide que se permita
   el dominio que aparezca en la URL (p.ej. `d3u0tzju9qaucj.cloudfront.net`).

## Cuando el usuario pida montar/editar un anuncio

El usuario hace anuncios (voz de ElevenLabs + textos + transiciones + música). Se montan aquí con
`ffmpeg`, que se instala solo al iniciar la sesión (`scripts/setup-ffmpeg.sh`, hook en `.claude/settings.json`).
Si `ffmpeg` no está, ejecuta ese script.

- Por defecto: 9:16 (1080x1920), 20–30 s, estructura gancho → problema → producto → oferta.
- Textos: este ffmpeg no tiene `drawtext`; usa subtítulos ASS (`-vf ass=textos.ass`), letra
  blanca gruesa con borde negro estilo TikTok (fuentes disponibles: DejaVu Sans Bold, FreeSans Bold).
- Transiciones con `xfade`, zoom suave con `zoompan`, la música baja cuando habla la voz (`sidechaincompress`).
- Clips: los que mande el usuario o generados con Higgsfield (solo los necesarios, gastan créditos).
- Trabaja en `out/`, revisa fotogramas antes de entregar y envía el `.mp4` final con la herramienta de enviar archivos.
- Los cambios los pide por chat ("texto más grande", "quita el clip 2"...): rehaz y reenvía.

## Notas

- Cada generación gasta créditos del usuario; los vídeos bastante más. Genera solo lo que pida.
- Si el usuario no indica modelo/formato, usa los valores por defecto de arriba y díselo.
- Responde en español.
