'use strict';

function parseCsvBuffer(buffer) {
  const text = buffer.toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').filter(l => l.trim() !== '');
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = splitRow(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitRow(lines[i]);
    if (values.every(v => v.trim() === '')) continue;
    const obj = { _line: i + 1 };
    headers.forEach((h, idx) => {
      const raw = values[idx]?.trim() ?? '';
      obj[h] = raw === '' ? null : raw;
    });
    rows.push(obj);
  }

  return { headers, rows };
}

function splitRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function toBoolean(val, defaultVal = true) {
  if (val === null || val === undefined) return defaultVal;
  return !['false', '0', 'no', 'inactive'].includes(String(val).toLowerCase().trim());
}

function toDecimal(val, defaultVal = 0) {
  const n = parseFloat(val);
  return isNaN(n) ? defaultVal : n;
}

function toInt(val, defaultVal = 0) {
  const n = parseInt(val, 10);
  return isNaN(n) ? defaultVal : n;
}

module.exports = { parseCsvBuffer, toBoolean, toDecimal, toInt };
