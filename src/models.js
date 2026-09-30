// Rutas de modelos de la plataforma, tomadas del catálogo de wide-trace/open-higgsfield
// (src/generation/catalog y src/generation/to-platform.ts).
// Las familias con variantes aceptan los sufijos /text-to-video, /image-to-video, etc.

export const IMAGE_MODELS = {
  "soul-2": "higgsfield-ai/soul/v2/standard",
  "soul-cinema": "higgsfield-ai/soul/cinema",
  "flux-2": "flux-2-pro",
  "grok-imagine-2": "xai/grok-imagine-image-2.0",
  "ideogram-4": "ideogram/v4.0",
  "qwen-image-3": "alibaba/qwen-image-3/text-to-image",
  "recraft-4.1": "recraft/v4.1/text-to-image",
  "z-image-turbo": "z-image/turbo",
};

export const VIDEO_MODELS = {
  dop: "higgsfield-ai/dop/lite", // requiere image_url
  "kling-3-turbo": "kling-video/v3.0-turbo/text-to-video", // o /image-to-video
  "kling-3-std": "kling-video/v3.0/std/text-to-video", // o /image-to-video
  "kling-3-pro": "kling-video/v3.0/pro/text-to-video",
  "kling-3-4k": "kling-video/v3.0/4k/text-to-video",
  "kling-3-motion-std": "kling-video/v3/motion-control/std",
  "kling-3-motion-pro": "kling-video/v3/motion-control/pro",
  "kling-2.6": "kling-video/v2.6/pro/text-to-video",
  "kling-2.5": "kling-video/v2.5-turbo/standard/image-to-video",
  "kling-o1": "kling-video/omni/first-last-frame",
  "kling-o3": "kling-video/o3/first-last-frame",
  "seedance-2": "bytedance/seedance-2.0/text-to-video", // o /image-to-video, /reference-to-video
  "seedance-2-fast": "bytedance/seedance-2.0/fast/text-to-video",
  "seedance-2-mini": "bytedance/seedance-2.0/mini/text-to-video",
  "seedance-2.5": "bytedance/seedance-2.5/text-to-video",
  "seedance-2.5-edit": "bytedance/seedance-2.5/video-edit",
  "seedance-2.5-extend": "bytedance/seedance-2.5/video-extend",
  "wan-2.6": "wan/v2.6/text-to-video",
  "wan-2.7": "wan/v2.7/text-to-video",
  "wan-3": "alibaba/wan-3.0/text-to-video",
  "wan-3-prime": "alibaba/wan-3.0-prime/text-to-video",
  "happy-horse-1": "alibaba/happy-horse/text-to-video",
  "happy-horse-1.1": "alibaba/happy-horse/v1.1/text-to-video",
  "flux-3": "blackforestlabs/flux-3/text-to-video",
  "ltx-2.5-fast": "lightricks/ltx-2.5/text-to-video/fast",
  "ltx-2.5-pro": "lightricks/ltx-2.5/text-to-video/pro",
  "minimax-h3": "minimax/h3/text-to-video",
  "hailuo-2.3": "minimax/hailuo-2.3/standard/text-to-video",
  "pixverse-6": "pixverse/v6/text-to-video",
  "grok-imagine-video-1.5": "xai/grok-imagine-video/v1.5/reference-to-video",
};

export const MODELS = { ...IMAGE_MODELS, ...VIDEO_MODELS };

/** Acepta un alias corto ("soul-2") o una ruta completa de la plataforma. */
export function resolveModel(name) {
  return MODELS[name] ?? name;
}
