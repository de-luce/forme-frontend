import { deleteJson, getJson, postJson, putJson } from './http.js';
import { ApiPaths } from './paths.js';

export async function fetchWatchList() {
  return getJson(ApiPaths.watch);
}

/** 全量替换（导入、清空批量） */
export async function replaceWatchList(list) {
  await putJson(ApiPaths.watch, list);
}

export async function fetchWatchOne(id) {
  return getJson(ApiPaths.watchOne(id));
}

export async function createWatchEntry(entry) {
  return postJson(ApiPaths.watch, entry);
}

export async function updateWatchEntry(id, entry) {
  return putJson(ApiPaths.watchOne(id), entry);
}

export async function deleteWatchEntry(id) {
  await deleteJson(ApiPaths.watchOne(id));
}
