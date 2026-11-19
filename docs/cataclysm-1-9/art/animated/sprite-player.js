// Dedicated 256px adapter. Does not modify inherited 96px actor-pack loader.
export async function loadFrames(base = '../../') {
  const url = new URL(base, import.meta.url);
  const response = await fetch(new URL('art/animated/frame-index.json', url));
  if (!response.ok) throw new Error(`Frame index HTTP ${response.status}`);
  const index = await response.json();
  const textures = {};
  await Promise.all(Object.entries(index.textures).map(async ([id, asset]) => {
    const image = new Image(); image.src = new URL(asset.path, url).href;
    await image.decode(); textures[id] = image;
  }));
  return {index, textures};
}
export function frameAt(index, animation, elapsedMs, reducedMotion = false) {
  const a = index.animations[animation];
  if (!a) throw new Error(`Unknown animation: ${animation}`);
  if (reducedMotion) return a.reduced_motion_frame;
  const total = a.durations_ms.reduce((x, y) => x + y, 0);
  let t = a.loop ? Math.max(0, elapsedMs) % total : Math.min(Math.max(0, elapsedMs), total - 1);
  for (let i = 0; i < a.frames.length; i++) {
    if (t < a.durations_ms[i]) return a.frames[i];
    t -= a.durations_ms[i];
  }
  return a.frames[a.frames.length - 1];
}
export function drawFrame(ctx, pack, key, footX, footY, width, flip = false) {
  const f = pack.index.frames[key];
  if (!f) throw new Error(`Unknown frame: ${key}`);
  const [sx, sy, sw, sh] = f.rect, scale = width / sw;
  ctx.save(); ctx.translate(footX, footY); ctx.scale(flip ? -scale : scale, scale);
  ctx.drawImage(pack.textures[f.texture], sx, sy, sw, sh, -f.pivot[0], -f.pivot[1], sw, sh);
  ctx.restore();
}
