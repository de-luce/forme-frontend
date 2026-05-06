import { getJson, putJson } from './http.js';

export async function fetchWorkYear(year) {
  return getJson('/api/work/' + year);
}

export async function saveWorkYear(year, data) {
  await putJson('/api/work/' + year, data);
}
