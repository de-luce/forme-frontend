import { getJson, putJson } from './http.js';

export async function fetchWatchList() {
  return getJson('/api/watch');
}

export async function saveWatchList(list) {
  await putJson('/api/watch', list);
}
