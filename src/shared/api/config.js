/**
 * VITE_API_BASE：后端根地址，无尾部斜杠。
 * 若 Nginx 将站点与 /api 反代到 Java，可留空或不设，请求走同源 `/api/...`。
 *
 * 注意：`getApiBase()` 为空字符串 `''` 在 JS 中为假值，不能用 `if (!getApiBase())`
 * 跳过接口——空表示同源 API，仍必须请求后端。
 */
function normalizeApiBase(raw) {
  let base = String(raw).trim().replace(/\/$/, '');
  // 纠正误写的 http://http://...
  base = base.replace(/^(?:https?:\/\/)+/i, 'http://');
  return base;
}

export function getApiBase() {
  const raw = import.meta.env.VITE_API_BASE;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return '';
  }
  const base = normalizeApiBase(raw);
  if (import.meta.env.DEV && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(base)) {
    console.warn(
      '[ForMe] VITE_API_BASE 指向本机，浏览器会连到 Mac 而非服务器。请留空 VITE_API_BASE，并用 VITE_DEV_PROXY_TARGET 指向服务器。'
    );
  }
  return base;
}

/** 是否配置了独立主机（非空）。仅用于展示/日志，不应拿来决定是否调后端。 */
export function hasExplicitApiHost() {
  const raw = import.meta.env.VITE_API_BASE;
  return raw != null && String(raw).trim() !== '';
}

export function apiUrl(path) {
  const base = getApiBase();
  const p = path.startsWith('/') ? path : '/' + path;
  if (!base) return p;
  return base + p;
}

export function apiHeaders(json, extra = {}) {
  const h = {
    Accept: 'application/json',
    ...extra,
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}
