/**
 * 统一 fetch：所有后端 JSON 请求经此出口，便于以后加超时、重试、日志。
 */
import { apiUrl, apiHeaders } from './config.js';

export async function getJson(path) {
  const r = await fetch(apiUrl(path), { headers: apiHeaders(false) });
  if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
  return r.json();
}

export async function putJson(path, body) {
  const r = await fetch(apiUrl(path), {
    method: 'PUT',
    headers: apiHeaders(true),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
}
