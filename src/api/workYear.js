import { deleteJson, getJson, putJson } from './http.js';
import { ApiPaths } from './paths.js';

export async function fetchWorkYear(year) {
  return getJson(ApiPaths.workYear(year));
}

/** 按年全量写入（Excel 导入） */
export async function saveWorkYear(year, data) {
  await putJson(ApiPaths.workYear(year), data);
}

/** 单日写入；value 空字符串表示删除该日 */
export async function putWorkDay(year, month, day, value) {
  await putJson(ApiPaths.workDay(year, month, day), { value: value ?? '' });
}

export async function deleteWorkDay(year, month, day) {
  await deleteJson(ApiPaths.workDay(year, month, day));
}
