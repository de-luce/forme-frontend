import { deleteJson, getJson, postJson, putJson } from '@/shared/api/http.js';

const WATCH = '/api/watch';

function watchOne(id) {
  return `/api/watch/${encodeURIComponent(String(id))}`;
}

export async function fetchWatchList() {
  return getJson(WATCH);
}

export async function replaceWatchList(list) {
  await putJson(WATCH, list);
}

export async function fetchWatchOne(id) {
  return getJson(watchOne(id));
}

export async function createWatchEntry(entry) {
  return postJson(WATCH, entry);
}

export async function updateWatchEntry(id, entry) {
  return putJson(watchOne(id), entry);
}

export async function deleteWatchEntry(id) {
  await deleteJson(watchOne(id));
}
