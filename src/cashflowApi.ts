import * as XLSX from 'xlsx';

const MAX_CHARS = 40000; // ~10k tokens — enough for a full cashflow model

function scoreSheet(rows: (string | number | null)[][]): number {
  // Score a sheet by how likely it is to be the cashflow projection table
  // (many year/age-like column headers, many data rows)
  if (rows.length < 3) return 0;

  const firstRow = rows.find(r => Array.isArray(r) && r.some(c => c !== null && c !== '')) ?? [];
  const numericCols = firstRow.filter(c => typeof c === 'number').length;

  // Count cells that look like years (2000–2100) or ages (30–110)
  const yearLikeCols = firstRow.filter(c =>
    typeof c === 'number' && ((c >= 2000 && c <= 2100) || (c >= 30 && c <= 110))
  ).length;

  // Count data rows (rows with at least 3 numeric values)
  const dataRows = rows.filter(r =>
    Array.isArray(r) && r.filter(c => typeof c === 'number').length >= 3
  ).length;

  return yearLikeCols * 10 + numericCols * 2 + dataRows;
}

// ─── Parse Excel to plain text — prioritises the cashflow projection sheet ──
export function parseExcelToText(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const workbook = XLSX.read(bytes, { type: 'array' });

  // Parse all sheets and score them
  const sheets: { name: string; rows: (string | number | null)[][]; score: number }[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
    });
    const hasContent = rows.some(r => Array.isArray(r) && r.some(c => c !== null && c !== ''));
    if (!hasContent) continue;
    sheets.push({ name: sheetName, rows, score: scoreSheet(rows) });
  }

  if (sheets.length === 0) return '(No data found in spreadsheet)';

  // Sort: highest-scored sheet first, then the rest
  sheets.sort((a, b) => b.score - a.score);
  const primary = sheets[0];
  const others = sheets.slice(1);

  function sheetToText(name: string, rows: (string | number | null)[][]): string {
    const lines: string[] = [`=== Sheet: ${name} ===`];
    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      const cells = row.map(cell => {
        if (cell === null || cell === undefined) return '';
        if (typeof cell === 'number') return Number.isInteger(cell) ? String(cell) : cell.toFixed(2);
        return String(cell).trim();
      });
      let last = cells.length - 1;
      while (last > 0 && cells[last] === '') last--;
      lines.push(cells.slice(0, last + 1).join('\t'));
    }
    return lines.join('\n');
  }

  const parts: string[] = [];

  // Primary sheet first (always included in full)
  parts.push(`[PRIMARY CASHFLOW SHEET — use this for the artifact]\n${sheetToText(primary.name, primary.rows)}`);

  // Add other sheets up to character budget
  let used = parts[0].length;
  for (const s of others) {
    const text = sheetToText(s.name, s.rows);
    if (used + text.length > MAX_CHARS) {
      parts.push(`=== Sheet: ${s.name} === [omitted — over size limit]`);
    } else {
      parts.push(text);
      used += text.length;
    }
  }

  return parts.join('\n\n');
}
