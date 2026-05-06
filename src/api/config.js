/**
 * VITE_API_BASE：后端根地址，无尾部斜杠。
 * 若 Nginx 将 https://你的域名/api 反代到 Java，可设为 ''，请求使用同源 /api/...
 */
export function getApiBase() {
  const raw = import.meta.env.VITE_API_BASE;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return '';
  }
  return String(raw).trim().replace(/\/$/, '');
}

export function getApiKey() {
  const k = import.meta.env.VITE_API_KEY;
  return k != null ? String(k).trim() : '';
}

export function apiUrl(path) {
  const base = getApiBase();
  const p = path.startsWith('/') ? path : '/' + path;
  if (!base) return p;
  return base + p;
}

export function apiHeaders(json) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  const key = getApiKey();
  if (key) h['X-API-Key'] = key;
  return h;
}
