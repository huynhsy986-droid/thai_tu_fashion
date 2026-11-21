/**
 * Logger có cấu trúc (Issue #4). Mỗi dòng log là 1 JSON → dễ lọc trên Render/Logtail:
 *   {"ts":"…","level":"info","msg":"request","reqId":"…","method":"GET","path":"/api/catalog","status":200,"ms":12}
 * LOG_FORMAT=pretty cho dev đọc bằng mắt.
 * Tác giả: TV2 – nguyen06-vn
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const SECRET_KEYS = /pass(word)?|token|authorization|secret|cookie/i;

/** Xoá giá trị nhạy cảm trước khi ghi log. */
export function redact(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 4) return obj;
  if (obj instanceof Error) return { name: obj.name, message: obj.message, code: obj.code, stack: obj.stack?.split('\n').slice(0, 6).join('\n') };
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) out[k] = SECRET_KEYS.test(k) ? '[redacted]' : redact(v, depth + 1);
  return out;
}

export function createLogger({ level = 'info', format = 'json', stream = process.stdout, errStream = process.stderr } = {}) {
  const min = LEVELS[level] ?? LEVELS.info;
  const write = (lvl, msg, fields = {}) => {
    if (LEVELS[lvl] < min) return;
    const rec = { ts: new Date().toISOString(), level: lvl, msg, ...redact(fields) };
    const line =
      format === 'pretty'
        ? `${rec.ts.slice(11, 19)} ${lvl.toUpperCase().padEnd(5)} ${msg}${Object.keys(fields).length ? ` ${JSON.stringify(redact(fields))}` : ''}`
        : JSON.stringify(rec);
    (LEVELS[lvl] >= LEVELS.warn ? errStream : stream).write(`${line}\n`);
  };
  return {
    debug: (m, f) => write('debug', m, f),
    info: (m, f) => write('info', m, f),
    warn: (m, f) => write('warn', m, f),
    error: (m, f) => write('error', m, f),
    /** tương thích console.log cũ */
    log: (m, f) => write('info', m, f),
  };
}

/** Logger im lặng cho test. */
export const silentLogger = { debug() {}, info() {}, warn() {}, error() {}, log() {} };
