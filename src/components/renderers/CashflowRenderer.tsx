import { useMemo } from 'react';

interface CashflowRow {
  label: string;
  values: (number | null)[];
  bold?: boolean;
  isTotal?: boolean;
  indent?: boolean;
  type?: 'income' | 'expense' | 'balance' | 'net' | 'info';
}

interface CashflowSection {
  title: string;
  rows: CashflowRow[];
}

export interface CashflowData {
  clientName: string;
  generatedAt: string;
  columnHeaders: string[];
  sections: CashflowSection[];
  notes?: string;
  netWorthValues?: (number | null)[];
}

interface Props {
  data: CashflowData;
}

function fmt(value: number | null): string {
  if (value === null || value === undefined) return '—';
  if (value === 0) return '—';
  const abs = Math.abs(value);
  const str = abs.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  return value < 0 ? `(${str})` : str;
}

function fmtAxis(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}£${(abs / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `${sign}£${Math.round(abs / 1_000)}k`;
  return `${sign}£${Math.round(abs)}`;
}

function rowColor(type: CashflowRow['type'], isTotal?: boolean): string {
  if (isTotal) return '#111827';
  switch (type) {
    case 'income':  return '#065f46';
    case 'expense': return '#991b1b';
    case 'balance': return '#1e3a5f';
    case 'net':     return '#111827';
    case 'info':    return '#6b7280';
    default:        return '#374151';
  }
}

function sectionAccent(type: CashflowRow['type'] | undefined): string {
  switch (type) {
    case 'income':  return '#059669';
    case 'expense': return '#dc2626';
    case 'balance': return '#2563eb';
    case 'net':     return '#374151';
    default:        return '#9ca3af';
  }
}

function findNetWorthValues(data: CashflowData): (number | null)[] | null {
  if (data.netWorthValues) return data.netWorthValues;
  // Search by label
  for (const section of data.sections) {
    for (const row of section.rows) {
      if (/net.{0,12}worth|liquid.{0,12}net|total.{0,12}asset/i.test(row.label)) {
        return row.values;
      }
    }
  }
  // Fallback: last isTotal row in the last balance section
  for (let si = data.sections.length - 1; si >= 0; si--) {
    const s = data.sections[si];
    if (s.rows[0]?.type === 'balance' || s.rows[0]?.type === 'net') {
      const totals = s.rows.filter(r => r.isTotal);
      if (totals.length > 0) return totals[totals.length - 1].values;
    }
  }
  return null;
}

// ─── SVG chart ────────────────────────────────────────────────────────────────
function NetWorthChart({ headers, values }: { headers: string[]; values: (number | null)[] }) {
  const W = 860;
  const H = 200;
  const PAD = { top: 24, right: 24, bottom: 40, left: 68 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return null;

  const minV = Math.min(...nums, 0);
  const maxV = Math.max(...nums);
  const range = maxV - minV || 1;

  // Pad top by 8%
  const minPlot = minV - range * 0.04;
  const maxPlot = maxV + range * 0.08;
  const plotRange = maxPlot - minPlot;

  const toX = (i: number) => PAD.left + (i / (values.length - 1)) * cW;
  const toY = (v: number) => PAD.top + cH - ((v - minPlot) / plotRange) * cH;

  const points: [number, number][] = [];
  values.forEach((v, i) => { if (v !== null) points.push([toX(i), toY(v)]); });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaPath = linePath
    + ` L${points[points.length - 1][0].toFixed(1)},${(PAD.top + cH).toFixed(1)}`
    + ` L${points[0][0].toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`;

  // Y ticks: 5 gridlines
  const N_Y = 5;
  const yTicks = Array.from({ length: N_Y + 1 }, (_, i) => minPlot + (plotRange * i) / N_Y);

  // X labels: every 5 columns, always first and last
  const xStep = values.length > 20 ? 5 : values.length > 10 ? 2 : 1;
  const xLabels = headers
    .map((h, i) => ({ h, i }))
    .filter(({ i }) => i % xStep === 0 || i === values.length - 1);

  // Peak annotation
  const peakIdx = nums.indexOf(maxV);
  const peakPoint = points.find(([x]) => Math.abs(x - toX(peakIdx)) < 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1a3a5c" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#1a3a5c" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Y gridlines + labels */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line
            x1={PAD.left} y1={toY(v).toFixed(1)}
            x2={PAD.left + cW} y2={toY(v).toFixed(1)}
            stroke="#e5e7eb" strokeWidth="0.75"
          />
          <text
            x={PAD.left - 7} y={toY(v)}
            textAnchor="end" dominantBaseline="middle"
            fontSize="9" fill="#9ca3af"
          >
            {fmtAxis(v)}
          </text>
        </g>
      ))}

      {/* Zero line */}
      {minV < 0 && (
        <line
          x1={PAD.left} y1={toY(0).toFixed(1)}
          x2={PAD.left + cW} y2={toY(0).toFixed(1)}
          stroke="#dc2626" strokeWidth="0.75" strokeDasharray="3,2" opacity="0.6"
        />
      )}

      {/* Area */}
      <path d={areaPath} fill="url(#cfGrad)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#1a3a5c" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />

      {/* Peak dot + label */}
      {peakPoint && (
        <>
          <circle cx={peakPoint[0]} cy={peakPoint[1]} r="3.5" fill="#1a3a5c" />
          <text
            x={peakPoint[0]}
            y={peakPoint[1] - 9}
            textAnchor="middle"
            fontSize="9" fontWeight="600" fill="#1a3a5c"
          >
            {fmtAxis(maxV)}
          </text>
        </>
      )}

      {/* X labels */}
      {xLabels.map(({ h, i }) => (
        <text
          key={i}
          x={toX(i).toFixed(1)} y={H - 6}
          textAnchor="middle"
          fontSize="9" fill="#6b7280"
        >
          {h}
        </text>
      ))}

      {/* Chart border */}
      <rect
        x={PAD.left} y={PAD.top} width={cW} height={cH}
        fill="none" stroke="#e5e7eb" strokeWidth="0.5"
      />
    </svg>
  );
}

// ─── Main renderer ─────────────────────────────────────────────────────────────
export default function CashflowRenderer({ data }: Props) {
  const cols = data.columnHeaders ?? [];

  // For portrait: if more than 15 columns, sample every 5 years
  const { sampledCols, sampledIndices, isSampled } = useMemo(() => {
    if (cols.length <= 15) {
      return { sampledCols: cols, sampledIndices: cols.map((_, i) => i), isSampled: false };
    }
    const indices: number[] = [];
    for (let i = 0; i < cols.length; i++) {
      if (i % 5 === 0) indices.push(i);
    }
    if (indices[indices.length - 1] !== cols.length - 1) indices.push(cols.length - 1);
    return {
      sampledCols: indices.map(i => cols[i]),
      sampledIndices: indices,
      isSampled: true,
    };
  }, [cols]);

  const netWorthValues = useMemo(() => findNetWorthValues(data), [data]);
  const LABEL_W = 180;

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '100%' }}>
      <style>{`
        @media print {
          .cf-no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* ── Chart ── */}
      {netWorthValues && (
        <div style={{
          marginBottom: 20,
          padding: '14px 16px 10px',
          background: 'white',
          borderRadius: 10,
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#1a3a5c',
            }}>
              Total Liquid Net Worth
            </span>
            {cols.length > 0 && (
              <span style={{ fontSize: 10, color: '#9ca3af' }}>
                {cols[0]} – {cols[cols.length - 1]}
              </span>
            )}
          </div>
          <NetWorthChart headers={cols} values={netWorthValues} />
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

        {/* Header row */}
        <div style={{ display: 'flex', background: '#1a3a5c' }}>
          <div style={{
            width: LABEL_W, flexShrink: 0,
            padding: '9px 14px',
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)',
            borderRight: '1px solid rgba(255,255,255,0.1)',
          }}>
            {data.clientName}
          </div>
          {sampledCols.map((h, i) => (
            <div key={i} style={{
              flex: 1, minWidth: 0,
              padding: '9px 0',
              textAlign: 'center',
              fontSize: 9, fontWeight: 600,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: '0.02em',
              borderRight: i < sampledCols.length - 1 ? '1px solid rgba(255,255,255,0.06)' : undefined,
              overflow: 'hidden', whiteSpace: 'nowrap',
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Sections */}
        {data.sections.map((section, si) => {
          const accent = sectionAccent(section.rows[0]?.type);
          return (
            <div key={si}>
              {/* Section header */}
              <div style={{
                display: 'flex', background: '#f8fafc',
                borderTop: si > 0 ? '2px solid #e5e7eb' : undefined,
                borderBottom: '1px solid #e5e7eb',
              }}>
                <div style={{
                  width: LABEL_W, flexShrink: 0,
                  padding: '6px 14px',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}>
                  <div style={{ width: 3, height: 13, borderRadius: 2, background: accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#374151' }}>
                    {section.title}
                  </span>
                </div>
                {sampledCols.map((_, i) => (
                  <div key={i} style={{ flex: 1, minWidth: 0 }} />
                ))}
              </div>

              {/* Rows */}
              {section.rows.map((row, ri) => {
                const isTotal = !!row.isTotal;
                const bg = isTotal ? '#f1f5f9' : ri % 2 === 1 ? '#fafafa' : '#ffffff';
                const color = rowColor(row.type, isTotal);
                return (
                  <div key={ri} style={{ display: 'flex', background: bg, borderBottom: '1px solid #f3f4f6' }}>
                    {/* Label */}
                    <div style={{
                      width: LABEL_W, flexShrink: 0,
                      padding: `4px 8px 4px ${row.indent ? 24 : 14}px`,
                      borderRight: '1px solid #e5e7eb',
                      display: 'flex', alignItems: 'center',
                    }}>
                      <span style={{
                        fontSize: 9.5,
                        fontWeight: isTotal || row.bold ? 600 : 400,
                        color,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {row.label}
                      </span>
                    </div>
                    {/* Values */}
                    {sampledIndices.map((ci, i) => {
                      const val = row.values[ci] ?? null;
                      const isNeg = val !== null && val < 0;
                      return (
                        <div key={i} style={{
                          flex: 1, minWidth: 0,
                          padding: '4px 5px',
                          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                          borderRight: i < sampledIndices.length - 1 ? '1px solid #f0f0f0' : undefined,
                        }}>
                          <span style={{
                            fontSize: 9,
                            fontWeight: isTotal || row.bold ? 600 : 400,
                            color: val === null || val === 0 ? '#d1d5db'
                              : isNeg ? '#dc2626'
                              : color,
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'nowrap',
                          }}>
                            {fmt(val)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Sampling note */}
      {isSampled && (
        <p style={{ marginTop: 6, fontSize: 9, color: '#9ca3af', textAlign: 'right' }}>
          5-year intervals shown · full {cols.length}-year model
        </p>
      )}

      {/* Notes */}
      {data.notes && (
        <div style={{
          marginTop: 14, padding: '10px 14px',
          background: '#fffbeb', borderRadius: 8,
          border: '1px solid #fde68a',
          fontSize: 10, color: '#92400e', lineHeight: 1.6,
        }}>
          <span style={{ fontWeight: 600 }}>Notes: </span>
          {data.notes}
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { label: 'Income',       color: '#059669' },
          { label: 'Expenditure',  color: '#dc2626' },
          { label: 'Balances',     color: '#2563eb' },
          { label: 'Net',          color: '#374151' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 9, color: '#6b7280' }}>{label}</span>
          </div>
        ))}
        <span style={{ fontSize: 9, color: '#9ca3af', marginLeft: 'auto' }}>
          £ · (brackets) = outflow · — = nil
        </span>
      </div>
    </div>
  );
}
