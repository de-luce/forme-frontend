import * as XLSX from 'xlsx-js-style';
import { buildExportRows, applyExportStyles, applyImportMatrix } from '@/features/work/domain/workStatsCore.js';

const EXPORT_IDB_NAME = 'ForMeWorkHours';
const EXPORT_IDB_STORE = 'excelExportHandle';
const EXPORT_IDB_VER = 1;

function idbOpenExport() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(EXPORT_IDB_NAME, EXPORT_IDB_VER);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(EXPORT_IDB_STORE)) {
        db.createObjectStore(EXPORT_IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function idbAccess(mode, cb) {
  const db = await idbOpenExport();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EXPORT_IDB_STORE, mode);
    const store = tx.objectStore(EXPORT_IDB_STORE);
    let result;
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve(result);
    cb(
      store,
      (v) => {
        result = v;
      },
      reject
    );
  });
}

function idbPutExportHandle(key, handle) {
  return idbAccess('readwrite', (store) => {
    store.put(handle, key);
  });
}

function idbGetExportHandle(key) {
  return idbAccess('readonly', (store, setResult, reject) => {
    const q = store.get(key);
    q.onsuccess = () => setResult(q.result);
    q.onerror = () => reject(q.error);
  });
}

async function writeWorkbookXlsxReplace(wb, defaultFileName, year) {
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const idbKey = 'xlsx-export-' + year;

  const writeToHandle = async (fileHandle) => {
    const writable = await fileHandle.createWritable();
    await writable.write(buf);
    await writable.close();
  };

  if (!window.showSaveFilePicker) {
    XLSX.writeFile(wb, defaultFileName);
    return;
  }

  let saved = null;
  try {
    saved = await idbGetExportHandle(idbKey);
  } catch (_) {}

  if (saved && typeof saved.createWritable === 'function') {
    try {
      let ok = (await saved.queryPermission({ mode: 'readwrite' })) === 'granted';
      if (!ok) ok = (await saved.requestPermission({ mode: 'readwrite' })) === 'granted';
      if (ok) {
        await writeToHandle(saved);
        return;
      }
    } catch (_) {}
  }

  try {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: defaultFileName,
      types: [
        {
          description: 'Excel 工作簿',
          accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          },
        },
      ],
    });
    await writeToHandle(fileHandle);
    await idbPutExportHandle(idbKey, fileHandle);
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    XLSX.writeFile(wb, defaultFileName);
  }
}

/**
 * Excel 导入导出；导入完成后调用 syncFullYearAfterImport（按年整体 PUT）。
 */
export function useWorkStatsExcel(year, data, syncFullYearAfterImport, viewRef) {
  async function exportFullYearExcel() {
    const ws = XLSX.utils.aoa_to_sheet(buildExportRows(year, data));
    ws['!cols'] = [{ wch: 6 }, ...Array(12).fill({ wch: 10 })];
    applyExportStyles(ws, year, XLSX);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, String(year));
    await writeWorkbookXlsxReplace(wb, `工时-${year}-全日.xlsx`, year);
  }

  function importFromExcel(ev) {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buf = new Uint8Array(e.target.result);
        const wb = XLSX.read(buf, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
        applyImportMatrix(year, data, matrix, XLSX);
        await syncFullYearAfterImport();
        if (viewRef.value === 'year') {
          viewRef.value = 'month';
        }
      } catch (err) {
        alert('导入失败：' + (err && err.message ? err.message : String(err)));
      }
    };
    reader.readAsArrayBuffer(f);
  }

  return { exportFullYearExcel, importFromExcel };
}
