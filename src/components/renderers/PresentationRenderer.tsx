import type { ClientPresentation, WrapperAllocation, RetainedAsset, PlanPhase } from '../../types';
import { formatCurrency } from '../../utils';

interface Props {
  data: ClientPresentation;
}

const NAVY   = '#1a3a5c';
const GOLD   = '#c9a84c';
const TEXT_HEADING   = '#1a1a2e';
const TEXT_BODY      = '#374151';
const TEXT_SECONDARY = '#6b7280';
const BORDER         = '#e5e7eb';
const SECTION_BG     = '#f9fafb';

const WRAPPER_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  Pension:               { bg: '#eff6ff', accent: '#1d4ed8', text: '#1e3a8a' },
  SIPP:                  { bg: '#eff6ff', accent: '#1d4ed8', text: '#1e3a8a' },
  ISA:                   { bg: '#f0fdf4', accent: '#16a34a', text: '#14532d' },
  'Stocks & Shares ISA': { bg: '#f0fdf4', accent: '#16a34a', text: '#14532d' },
  LISA:                  { bg: '#ecfdf5', accent: '#059669', text: '#064e3b' },
  GIA:                   { bg: '#fffbeb', accent: '#d97706', text: '#78350f' },
  'Onshore Bond':        { bg: '#fdf4ff', accent: '#9333ea', text: '#581c87' },
  'Offshore Bond':       { bg: '#f5f3ff', accent: '#7c3aed', text: '#4c1d95' },
  Drawdown:              { bg: '#fff7ed', accent: '#ea580c', text: '#7c2d12' },
};

const WRAPPER_PURPOSE: Record<string, string> = {
  Pension:               'Retirement pot — tax-efficient growth',
  SIPP:                  'Self-invested retirement pot — tax-efficient growth',
  ISA:                   'Tax-free growth and income',
  'Stocks & Shares ISA': 'Tax-free growth and income',
  LISA:                  'Lifetime ISA — 25% government bonus',
  GIA:                   'Flexible general investment account',
  Drawdown:              'Flexible income in retirement',
  'Onshore Bond':        'Tax-deferred investment bond',
  'Offshore Bond':       'Tax-deferred offshore investment bond',
};

function wrapperColors(type: string) {
  return WRAPPER_COLORS[type] ?? { bg: '#f9fafb', accent: '#6b7280', text: '#374151' };
}

// ─── Print CSS ──────────────────────────────────────────────────────────────
const PRINT_STYLES = `
@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Each slide starts a new page — no artificial stretching */
  .pres-slide {
    page-break-after: always !important;
    break-after: page !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    margin: 0 !important;
  }
  .pres-slide:last-of-type {
    page-break-after: auto !important;
    break-after: auto !important;
  }
  /* Prevent cards splitting mid-content */
  .pres-wrapper-card,
  .pres-source-card,
  .pres-retained-card,
  .pres-wealth-section,
  .pres-fund-row {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  /* Full-bleed header */
  .pres-header {
    border-radius: 0 !important;
    padding: 9mm 18mm !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
  }
  .pres-header-right {
    display: block !important;
  }

  /* Body */
  .pres-body {
    flex: 1 !important;
    padding: 10mm 18mm 6mm !important;
  }

  /* Footer */
  .pres-footer {
    border-radius: 0 !important;
    padding: 4mm 18mm !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
  }
  .pres-page-num {
    display: block !important;
  }

  /* Slightly larger text for print readability */
  .pres-body h2 {
    font-size: 16pt !important;
    margin-bottom: 6mm !important;
  }
  .pres-source-card,
  .pres-wrapper-card,
  .pres-retained-card,
  .pres-fund-row {
    border-radius: 4pt !important;
  }
  .pres-wealth-section {
    border-radius: 4pt !important;
    overflow: hidden !important;
  }
}

/* Hide page numbers on screen */
.pres-page-num { display: none; }
.pres-header-right { display: none; }
`;

// ─── Slide shell ────────────────────────────────────────────────────────────
interface SlideShellProps {
  children: React.ReactNode;
  clientName: string;
  slideNum: number;
  totalSlides: number;
  generatedAt: string;
}

function SlideShell({ children, clientName, slideNum, totalSlides, generatedAt }: SlideShellProps) {
  const dateStr = new Date(generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="pres-slide" style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <div className="pres-header" style={{ background: NAVY, padding: '11px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'white', letterSpacing: '0.05em' }}>HF</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.9)' }}>
            Highcross Financial
          </span>
        </div>
        {/* Print-only: client name + date on the right */}
        <div className="pres-header-right" style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: GOLD }}>{clientName}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{dateStr}</div>
        </div>
      </div>

      {/* Body */}
      <div className="pres-body" style={{ padding: '28px 32px', background: 'white', flex: 1 }}>
        {children}
      </div>

      {/* Footer */}
      <div className="pres-footer" style={{ padding: '10px 32px', background: SECTION_BG, borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>
          For discussion purposes only. Not a recommendation until confirmed in writing by your adviser.
        </p>
        <span className="pres-page-num" style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap', marginLeft: 16 }}>
          {slideNum} of {totalSlides}
        </span>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function ArrowIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke={GOLD} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7-7 7M3 12h18" />
    </svg>
  );
}

function WrapperCard({ wrapper }: { wrapper: WrapperAllocation }) {
  const colors = wrapperColors(wrapper.wrapperType);
  const purposeText = wrapper.futureNotes && wrapper.futureNotes.length < 60
    ? wrapper.futureNotes
    : WRAPPER_PURPOSE[wrapper.wrapperType] ?? '';

  return (
    <div className="pres-wrapper-card" style={{ background: colors.bg, border: `1px solid ${colors.accent}30`, borderRadius: 10, padding: '14px 16px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{wrapper.wrapperType}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: colors.text, flexShrink: 0 }}>
          {wrapper.initialValue > 0 ? formatCurrency(wrapper.initialValue) : '—'}
        </span>
      </div>
      {wrapper.platform && (
        <p style={{ fontSize: 10, color: colors.accent, margin: '0 0 4px', fontWeight: 500 }}>{wrapper.platform}</p>
      )}
      {purposeText && (
        <p style={{ fontSize: 10, color: colors.accent, margin: '0 0 8px', lineHeight: 1.4 }}>{purposeText}</p>
      )}
      {wrapper.actions.map((flow, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 4 }}>
          <svg width="11" height="11" fill="none" stroke={GOLD} viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 2 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7-7 7M3 12h18" />
          </svg>
          <span style={{ fontSize: 11, color: TEXT_BODY, lineHeight: 1.45 }}>{flow}</span>
        </div>
      ))}
    </div>
  );
}

function RetainedCard({ asset }: { asset: RetainedAsset }) {
  return (
    <div className="pres-retained-card" style={{ background: '#f9fafb', border: `1px solid ${BORDER}`, borderLeft: '3px solid #9ca3af', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_HEADING }}>{asset.name}</span>
        {asset.value != null && (
          <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_SECONDARY, flexShrink: 0 }}>{formatCurrency(asset.value)}</span>
        )}
      </div>
      {asset.notes && (
        <p style={{ fontSize: 11, color: TEXT_SECONDARY, margin: 0, lineHeight: 1.4 }}>{asset.notes}</p>
      )}
    </div>
  );
}

function PhaseBlock({ phase }: { phase: PlanPhase }) {
  return (
    <div style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 8, padding: '12px 16px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#92400e', margin: '0 0 8px', letterSpacing: '0.03em' }}>{phase.title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {phase.actions.map((action, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: GOLD, flexShrink: 0, marginTop: 5 }} />
            <span style={{ fontSize: 12, color: TEXT_BODY, lineHeight: 1.5 }}>{action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WealthSection({ wrapper }: { wrapper: WrapperAllocation }) {
  const colors = wrapperColors(wrapper.wrapperType);
  const purposeText = wrapper.futureNotes && wrapper.futureNotes.length < 80
    ? wrapper.futureNotes
    : WRAPPER_PURPOSE[wrapper.wrapperType] ?? '';

  return (
    <div className="pres-wealth-section" style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ background: colors.bg, borderBottom: `1px solid ${colors.accent}30`, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{wrapper.wrapperType}</span>
          <span style={{ fontSize: 11, color: colors.accent, marginLeft: 10 }}>
            via {wrapper.provider}{wrapper.platform && wrapper.platform !== wrapper.provider ? ` · ${wrapper.platform}` : ''}
          </span>
        </div>
        <span style={{ fontSize: 20, fontWeight: 700, color: colors.text, flexShrink: 0 }}>
          {wrapper.initialValue > 0 ? formatCurrency(wrapper.initialValue) : '—'}
        </span>
      </div>
      <div style={{ padding: '12px 18px', background: 'white' }}>
        {purposeText && (
          <p style={{ fontSize: 11, color: TEXT_SECONDARY, margin: '0 0 10px', fontStyle: 'italic' }}>{purposeText}</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {wrapper.actions.map((action, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: colors.accent, flexShrink: 0, marginTop: 5 }} />
              <span style={{ fontSize: 12, color: TEXT_BODY, lineHeight: 1.5 }}>{action}</span>
            </div>
          ))}
        </div>
        {wrapper.futureValue != null && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: TEXT_SECONDARY }}>Projected value at retirement</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{formatCurrency(wrapper.futureValue)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main renderer ───────────────────────────────────────────────────────────
export default function PresentationRenderer({ data }: Props) {
  const totalWealth = data.wrapperAllocations.reduce((sum, w) => sum + (w.initialValue ?? 0), 0);
  const retainedTotal = (data.retainedAssets ?? []).reduce((sum, a) => sum + (a.value ?? 0), 0);
  const grandTotal = totalWealth + retainedTotal;

  const platformLabel = data.targetPlatforms?.length
    ? data.targetPlatforms.join(' · ')
    : data.targetPlatform;

  const allPhases: PlanPhase[] = [...(data.phases ?? [])];
  if (data.nextYearAction && allPhases.length === 0) {
    allPhases.push({ title: 'Next steps', actions: [data.nextYearAction] });
  }

  const hasRetained = (data.retainedAssets ?? []).length > 0;
  const TOTAL_SLIDES = 3;
  const shellProps = { clientName: data.clientName, totalSlides: TOTAL_SLIDES, generatedAt: data.generatedAt };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{PRINT_STYLES}</style>

      {/* ── Slide 1: Plan Schematic ── */}
      <SlideShell {...shellProps} slideNum={1}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: TEXT_HEADING, margin: '0 0 24px' }}>
          {data.slideOneTitle ?? 'Plan Schematic'}
        </h2>

        {/* Flow: current → platform */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {/* Source assets */}
          <div style={{ flex: '0 0 auto', minWidth: 160, maxWidth: 220 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: TEXT_SECONDARY, marginBottom: 10 }}>
              Current
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.sourceAssets.map((asset, i) => (
                <div key={i} className="pres-source-card" style={{ background: SECTION_BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_HEADING }}>{asset.name}</div>
                  {asset.value != null && (
                    <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginTop: 1 }}>{formatCurrency(asset.value)}</div>
                  )}
                  {asset.notes && (
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, fontStyle: 'italic' }}>{asset.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div style={{ paddingTop: 34, flexShrink: 0 }}>
            <ArrowIcon />
          </div>

          {/* Target wrappers */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: TEXT_SECONDARY, marginBottom: 10 }}>
              {platformLabel}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.wrapperAllocations.map((wrapper, i) => (
                <WrapperCard key={i} wrapper={wrapper} />
              ))}
            </div>
          </div>
        </div>

        {/* Retained */}
        {hasRetained && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#9ca3af', marginBottom: 8 }}>
              Retained — stays in place
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(data.retainedAssets ?? []).map((asset, i) => (
                <RetainedCard key={i} asset={asset} />
              ))}
            </div>
          </div>
        )}

        {/* Phases */}
        {allPhases.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allPhases.map((phase, i) => (
              <PhaseBlock key={i} phase={phase} />
            ))}
          </div>
        )}
      </SlideShell>

      {/* ── Slide 2: Top-Down Overview ── */}
      <SlideShell {...shellProps} slideNum={2}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: TEXT_HEADING, margin: 0 }}>
            {data.slideTwoTitle ?? 'Top-Down Overview'}
          </h2>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: TEXT_SECONDARY }}>
              Total Wealth
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: NAVY }}>
              {formatCurrency(grandTotal || totalWealth)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.wrapperAllocations.map((wrapper, i) => (
            <WealthSection key={i} wrapper={wrapper} />
          ))}
        </div>

        {hasRetained && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#9ca3af', marginBottom: 8 }}>
              Retained Assets
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(data.retainedAssets ?? []).map((asset, i) => (
                <RetainedCard key={i} asset={asset} />
              ))}
            </div>
          </div>
        )}

        {data.incomeTarget && (
          <div style={{ marginTop: 20, background: 'white', border: `1px solid ${BORDER}`, borderLeft: `4px solid ${NAVY}`, borderRadius: 8, padding: '13px 18px' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: TEXT_HEADING, margin: 0 }}>{data.incomeTarget}</p>
          </div>
        )}
      </SlideShell>

      {/* ── Slide 3: Investment Plan ── */}
      <SlideShell {...shellProps} slideNum={3}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: TEXT_HEADING, margin: '0 0 24px' }}>
          {data.slideThreeTitle ?? 'Investment Plan'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {data.wrapperAllocations.map((wrapper, i) => {
            const colors = wrapperColors(wrapper.wrapperType);
            return (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_HEADING }}>{wrapper.wrapperType}</span>
                  <span style={{ fontSize: 11, color: TEXT_SECONDARY }}>
                    via {wrapper.provider}{wrapper.platform && wrapper.platform !== wrapper.provider ? ` · ${wrapper.platform}` : ''}
                  </span>
                  {wrapper.initialValue > 0 && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_SECONDARY, marginLeft: 'auto' }}>
                      {formatCurrency(wrapper.initialValue)}
                    </span>
                  )}
                </div>
                <div style={{ height: 1, background: BORDER, marginBottom: 10 }} />
                {wrapper.funds.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {wrapper.funds.map((fund, j) => (
                      <div key={j} className="pres-fund-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: SECTION_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '9px 14px' }}>
                        <span style={{ fontSize: 13, color: TEXT_BODY }}>{fund.name}</span>
                        {fund.percentage != null && (
                          <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{fund.percentage}%</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>Fund allocation to be confirmed</p>
                )}
              </div>
            );
          })}
        </div>
      </SlideShell>
    </div>
  );
}
