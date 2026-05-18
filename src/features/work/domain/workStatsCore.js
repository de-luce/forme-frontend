/** 工时统计纯逻辑（由原 统计.html 抽取） */

export const STANDARD = 480;

export function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

export function parse(v) {
  if (!v) return null;
  const [a, b] = String(v).split('.');
  return (Number(a) || 0) * 60 + (Number(b) || 0);
}

export function format(m) {
  const h = Math.floor(Math.abs(m) / 60);
  const mm = Math.abs(m) % 60;
  return h + 'h' + mm + 'm';
}

export function formatSignedDiff(minutes) {
  if (minutes === 0) return '±0h0m';
  const sign = minutes > 0 ? '+' : '-';
  return sign + format(minutes);
}

export function normalize(v) {
  if (!v) return '';
  const [a, b] = String(v).split('.');
  return `${parseInt(a || 0, 10)}.${String(parseInt(b || 0, 10)).padStart(2, '0')}`;
}

export function dayKey(YEAR, m, d) {
  return `${YEAR}-${m}-${d}`;
}

export function parseMonthColumnHeader(cell) {
  const s = String(cell == null ? '' : cell).trim();
  const m = s.match(/^(\d{1,2})\s*月\s*$/);
  if (m) return +m[1];
  const m2 = s.match(/^M\s*(\d{1,2})$/i);
  if (m2) return +m2[1];
  return null;
}

export function parseRowDateParts(cell, XLSX) {
  if (cell instanceof Date && !isNaN(+cell)) {
    return { y: cell.getFullYear(), m: cell.getMonth() + 1, d: cell.getDate() };
  }
  if (typeof cell === 'number' && XLSX?.SSF) {
    const u = XLSX.SSF.parse_date_code(cell);
    if (u && u.y != null && u.m != null && u.d != null) {
      return { y: u.y, m: u.m, d: u.d };
    }
  }
  if (typeof cell === 'number' && cell > 20000 && cell < 60000) {
    const ms = (cell - 25569) * 86400 * 1000;
    const d = new Date(ms);
    if (!isNaN(d)) {
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
    }
  }
  const s = String(cell == null ? '' : cell).trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return { y: +m[1], m: +m[2], d: +m[3] };
  return null;
}

export function parseDayNumber(v) {
  if (typeof v === 'number') return Math.floor(v);
  if (typeof v === 'string') return parseInt(v.trim(), 10);
  return NaN;
}

export function cellToHoursStr(cell) {
  if (cell === '' || cell == null) return '';
  if (typeof cell === 'number' && Number.isFinite(cell)) {
    return normalize((Math.round(cell * 100) / 100).toFixed(2));
  }
  return normalize(String(cell).trim());
}

export function getMonthStats(YEAR, data, m) {
  const days = daysInMonth(YEAR, m);
  let total = 0;
  let hasData = false;
  for (let d = 1; d <= days; d++) {
    const p = parse(data[dayKey(YEAR, m, d)]);
    if (p == null) continue;
    hasData = true;
    total += p - STANDARD;
  }
  return { days, total, hasData };
}

export function isWideMonthFormat(matrix) {
  const h = matrix[0];
  if (!h || h.length < 2) return false;
  if (String(h[0] || '').includes('日期')) return false;
  return parseMonthColumnHeader(h[1]) != null;
}

export function clearYearData(YEAR, data) {
  const prefix = YEAR + '-';
  for (const k of Object.keys(data)) {
    if (k.startsWith(prefix)) delete data[k];
  }
}

export function setDataValue(YEAR, data, k, raw) {
  const hs = cellToHoursStr(raw);
  if (hs === '') delete data[k];
  else data[k] = hs;
}

export function collectMonthCols(header) {
  const cols = [];
  for (let c = 1; c < header.length; c++) {
    const m = parseMonthColumnHeader(header[c]);
    if (m >= 1 && m <= 12) cols.push({ c, m });
  }
  return cols;
}

export function applyWideMonthImport(YEAR, data, matrix) {
  const monthCols = collectMonthCols(matrix[0]);
  if (monthCols.length === 0) return false;
  clearYearData(YEAR, data);
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length === 0) continue;
    const d = parseDayNumber(row[0]);
    if (!Number.isFinite(d) || d < 1 || d > 31) continue;
    for (const { c, m } of monthCols) {
      if (d > daysInMonth(YEAR, m)) continue;
      setDataValue(YEAR, data, dayKey(YEAR, m, d), row[c]);
    }
  }
  return true;
}

export function applyLongRowImport(YEAR, data, matrix, XLSX) {
  let startRow = 0;
  const h0 = String(matrix[0][0] || '').trim();
  if (h0 === '日期' || h0.includes('日期')) startRow = 1;
  clearYearData(YEAR, data);
  for (let r = startRow; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || !row.length) continue;
    const parts = parseRowDateParts(row[0], XLSX);
    if (!parts || parts.y !== YEAR) continue;
    setDataValue(YEAR, data, dayKey(YEAR, parts.m, parts.d), row[1]);
  }
}

export function applyImportMatrix(YEAR, data, matrix, XLSX) {
  if (!matrix || !matrix.length) return;
  if (isWideMonthFormat(matrix)) {
    applyWideMonthImport(YEAR, data, matrix);
  } else {
    applyLongRowImport(YEAR, data, matrix, XLSX);
  }
}

export function buildExportRows(YEAR, data) {
  const header = ['日'];
  for (let m = 1; m <= 12; m++) header.push(`${m}月`);
  const rows = [header];
  for (let d = 1; d <= 31; d++) {
    const row = [d];
    for (let m = 1; m <= 12; m++) {
      if (d > daysInMonth(YEAR, m)) {
        row.push('');
      } else {
        row.push(data[dayKey(YEAR, m, d)] || '');
      }
    }
    rows.push(row);
  }
  return rows;
}

export function applyExportStyles(ws, YEAR, XLSX) {
  const styleHeaderDay = {
    fill: { patternType: 'solid', fgColor: { rgb: 'FFBFDBFE' } },
    font: { bold: true, color: { rgb: 'FF1E3A5F' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const styleHeaderMonth = {
    fill: { patternType: 'solid', fgColor: { rgb: 'FFA7F3D0' } },
    font: { bold: true, color: { rgb: 'FF14532D' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const styleColDay = {
    fill: { patternType: 'solid', fgColor: { rgb: 'FFEFF6FF' } },
    font: { color: { rgb: 'FF1E40AF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const styleData = {
    fill: { patternType: 'solid', fgColor: { rgb: 'FFF8FAFC' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const styleNoDay = {
    fill: { patternType: 'solid', fgColor: { rgb: 'FFF1F5F9' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (!cell) continue;
      if (C === 0) {
        cell.s = R === 0 ? styleHeaderDay : styleColDay;
      } else if (R === 0) {
        cell.s = styleHeaderMonth;
      } else {
        const dayNum = R;
        const monthNum = C;
        const invalid = dayNum > daysInMonth(YEAR, monthNum);
        cell.s = invalid ? styleNoDay : styleData;
      }
    }
  }
}
