/**
 * 与后端 `com.deluce.backend.web` 包下 Controller 路径一致。
 */
export const ApiPaths = {
  /** GET /api/health → { ok, database } */
  health: '/api/health',
  /** GET 列表、POST 新增、PUT 全量替换 */
  watch: '/api/watch',
  /** GET、PUT、DELETE 单条 */
  watchOne: (id) => `/api/watch/${encodeURIComponent(String(id))}`,
  /** GET、PUT 按年 */
  workYear: (year) => `/api/work/${encodeURIComponent(String(year))}`,
  /** PUT、DELETE 单日 */
  workDay: (year, month, day) =>
    `/api/work/${encodeURIComponent(String(year))}/day/${Number(month)}/${Number(day)}`,
};
