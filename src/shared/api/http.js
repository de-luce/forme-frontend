/**
 * 统一 fetch：所有后端 JSON 请求经此出口，便于以后加超时、重试、日志。
 */
import { apiUrl, apiHeaders } from './config.js';

/** 是否为 SPA/Nginx 回退返回的 HTML（而非接口 JSON） */
function looksLikeHtml(text) {
  if (!text || typeof text !== 'string') return false;
  const head = text.trimStart().slice(0, 80).toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('<');
}

function parseJsonFromText(text, method, requestUrl) {
  if (looksLikeHtml(text)) {
    throw new Error(
      [
        '服务器返回了网页(HTML)而不是 JSON。',
        '常见原因：① VITE_API_BASE 指向了纯静态站点；② Nginx 未把 /api 反代到 Spring Boot，请求落到了 index.html；③ 端口或路径错误。',
        `请求: ${method} ${requestUrl}`,
      ].join(' ')
    );
  }
  if (!text || !text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(
      `响应不是合法 JSON（${method} ${requestUrl}）：${String(e.message)}，正文片段：${text.slice(0, 160)}`
    );
  }
}

async function formatHttpError(status, text) {
  try {
    const j = JSON.parse(text);
    if (j && j.error) return `${status} ${j.error}`;
  } catch (_) {}
  if (looksLikeHtml(text)) {
    return `${status}：服务端返回了 HTML 页面（可能是 404 页或未配置 API 反代）`;
  }
  return `${status} ${text?.slice(0, 200) || ''}`.trim();
}

export async function getJson(path) {
  const url = apiUrl(path);
  const r = await fetch(url, { headers: apiHeaders(false) });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(await formatHttpError(r.status, text));
  }
  return parseJsonFromText(text, 'GET', url);
}

export async function putJson(path, body) {
  const url = apiUrl(path);
  const r = await fetch(url, {
    method: 'PUT',
    headers: apiHeaders(true),
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(await formatHttpError(r.status, text));
  }
  if (text && text.trim()) {
    parseJsonFromText(text, 'PUT', url);
  }
}

export async function postJson(path, body) {
  const url = apiUrl(path);
  const r = await fetch(url, {
    method: 'POST',
    headers: apiHeaders(true),
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(await formatHttpError(r.status, text));
  }
  const ct = r.headers.get('content-type');
  if (!text || !text.trim()) {
    return null;
  }
  if (ct && !ct.includes('application/json') && !looksLikeHtml(text)) {
    return null;
  }
  return parseJsonFromText(text, 'POST', url);
}

export async function deleteJson(path) {
  const url = apiUrl(path);
  const r = await fetch(url, {
    method: 'DELETE',
    headers: apiHeaders(false),
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(await formatHttpError(r.status, text));
  }
  if (text && text.trim()) {
    parseJsonFromText(text, 'DELETE', url);
  }
}
