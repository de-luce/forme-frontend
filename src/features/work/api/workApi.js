import { deleteJson, getJson, putJson } from '@/shared/api/http.js';

function workYear(year) {
  return `/api/work/${encodeURIComponent(String(year))}`;
}

function workDay(year, month, day) {
  return `/api/work/${encodeURIComponent(String(year))}/day/${Number(month)}/${Number(day)}`;
}

export async function fetchWorkYear(year) {
  return getJson(workYear(year));
}

export async function saveWorkYear(year, data) {
  await putJson(workYear(year), data);
}

export async function putWorkDay(year, month, day, value) {
  await putJson(workDay(year, month, day), { value: value ?? '' });
}

export async function deleteWorkDay(year, month, day) {
  await deleteJson(workDay(year, month, day));
}
