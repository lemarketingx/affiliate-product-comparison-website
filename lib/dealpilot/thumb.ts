const CDN_HOST = /(^|\.)(alicdn\.com|aliexpress-media\.com)$/;

/** AliExpress CDN thumbnail (smaller transfer on mobile). The original is the fallback. */
export function thumbUrl(src: string, size = 350): string {
  try {
    const u = new URL(src);
    if (!CDN_HOST.test(u.hostname) || u.search || u.hash) return src;
    if (!/\.(jpe?g|png|webp)$/i.test(u.pathname) || /_\d+x\d+/.test(u.pathname)) return src;
    return src + `_${size}x${size}.jpg`;
  } catch {
    return src;
  }
}
