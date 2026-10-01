#!/usr/bin/env bash
# Instala ffmpeg (editor de vídeo para montar anuncios) si no está ya disponible.
# Se ejecuta solo al iniciar cada sesión (ver .claude/settings.json).
set -u
command -v ffmpeg >/dev/null 2>&1 && exit 0

dir="$(cd "$(dirname "$0")/.." && pwd)/.tools"
mkdir -p "$dir"
npm install --silent --no-save --no-audit --no-fund --prefix "$dir" ffmpeg-static >/dev/null 2>&1 || {
  echo "setup-ffmpeg: no se pudo instalar ffmpeg-static" >&2
  exit 0
}
bin="$dir/node_modules/ffmpeg-static/ffmpeg"
ln -sf "$bin" /usr/local/bin/ffmpeg 2>/dev/null || echo "setup-ffmpeg: ffmpeg en $bin"
