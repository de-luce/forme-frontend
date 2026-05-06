/**
 * 与 Java 后端（server.port=8787）一致。
 * GitHub Pages 为 HTTPS 时，浏览器会拦截对 http:// 的跨域请求，请为 8.133.200.87 配置 HTTPS 或前端改用 https://（反代）。
 */
window.FORME_API_BASE = window.FORME_API_BASE || 'http://8.133.200.87:8787';
window.FORME_API_KEY = window.FORME_API_KEY || '';
