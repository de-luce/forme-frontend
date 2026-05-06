import { getJson } from './http.js';
import { ApiPaths } from './paths.js';

/**
 * GET /api/health → `{ ok, database }`（database 为当前 JDBC 库名，一般为 forme）
 */
export async function fetchHealth() {
  return getJson(ApiPaths.health);
}
