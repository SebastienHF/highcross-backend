import { formatCurrency } from '../../utils';

// --- Design tokens ---
const NAVY = '#1a3a5c';
const TEXT_HEADING = '#1a1a2e';
const TEXT_BODY = '#374151';
const TEXT_SECONDARY = '#6b7280';
const BORDER = '#e5e7eb';
const SECTION_BG = '#f9fafb';

interface FundCharge {
  fund: string;
  ocf: number;
}

interface FundAllocation {
  name: string;
  allocation: number;
  assetClass?: string;
}

interface RetirementOption {
  available: boolean | null;
  notes: string | null;
}

interface LimitingFactor {
  severity: 'amber' | 'red';
  description: string;
  detail?: string | null;
}

interface Scheme {
  provider: string;
  policyNumber?: string;
  schemeType: string;
  currentValue: number;
  transferValue?: number;
  policyHolder?: string;
  charges?: {
    amc?: number;
    platformCharge?: number;
    fundCharges?: FundCharge[];
    totalCharge?: number;
  };
  funds?: FundAllocation[];
  retirementOptions?: {
    drawdown?: RetirementOption;
    annuity?: RetirementOption;
    fullEncashment?: RetirementOption;
    partialEncashment?: RetirementOption;
    minimumRetirementAge?: number;
  };
  planFeatures?: {
    nominatedBeneficiaries?: string;
    trustStatus?: string;
    otherFeatures?: string[];
  };
  limitingFactors?: LimitingFactor[];
}

interface SchemeAssessmentData {
  schemes: Scheme[];
  assessedAt?: string;
}

interface Props {
  data: SchemeAssessmentData;
}

function pct(v: number | undefined): string {
  if (v === undefined || v === null) return '—';
  return `${v.toFixed(2)}%`;
}

// Section header used throughout
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: TEXT_SECONDARY, marginBottom: 16 }}>
      {children}
    </div>
  );
}

function OptionStatus({ option }: { option: RetirementOption | undefined }) {
  if (!option) return <span style={{ color: TEXT_SECONDARY }}>—</span>;
  if (option.available === null) {
    return <span style={{ fontSize: 12, color: '#b45309' }}>Check with provider</span>;
  }
  return (
    <span style={{ fontSize: 12, color: option.available ? '#16a34a' : '#dc2626' }}>
      {option.available ? 'Available' : 'Not available'}
      {option.notes && <span style={{ color: TEXT_SECONDARY }}> — {option.notes}</span>}
    </span>
  );
}

function LimitingFactorCallout({ factor }: { factor: LimitingFactor }) {
  const isRed = factor.severity === 'red';
  const bg = isRed ? '#fee2e2' : 'rgba(245,158,11,0.08)';
  const borderColor = isRed ? 'rgba(220,38,38,0.25)' : 'rgba(217,119,6,0.25)';
  const badgeBg = isRed ? '#fee2e2' : '#fffbeb';
  const badgeColor = isRed ? '#dc2626' : '#b45309';
  const badgeBorder = isRed ? 'rgba(220,38,38,0.25)' : 'rgba(217,119,6,0.25)';
  const label = isRed ? 'MATERIAL' : 'NOTABLE';

  return (
    <div style={{ background: bg, border: `1px solid ${borderColor}`, borderRadius: 10, padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{
          flexShrink: 0, padding: '4px 12px', borderRadius: 999,
          fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
          background: badgeBg, color: badgeColor,
          border: `1px solid ${badgeBorder}`,
        }}>
          {label}
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: TEXT_HEADING, margin: 0 }}>
            {factor.description}
          </p>
          {factor.detail && (
            <p style={{ fontSize: 13, lineHeight: 1.6, color: TEXT_SECONDARY, margin: '6px 0 0' }}>
              {factor.detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionDivider() {
  return <div style={{ height: 1, background: BORDER, margin: '0 -32px' }} />;
}

function SchemeSection({ scheme }: { scheme: Scheme }) {
  const isPension = scheme.schemeType?.toLowerCase().includes('pension');
  const amberCount = scheme.limitingFactors?.filter(f => f.severity === 'amber').length ?? 0;
  const redCount = scheme.limitingFactors?.filter(f => f.severity === 'red').length ?? 0;
  const hasLimiting = (scheme.limitingFactors?.length ?? 0) > 0;

  // Table header style for inner tables
  const thStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase' as const, color: TEXT_SECONDARY,
    padding: '10px 0', borderBottom: `1px solid ${BORDER}`,
    background: 'transparent',
  };

  return (
    <div style={{
      background: 'white',
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 32,
    }}>
      {/* Navy header */}
      <div style={{ padding: '28px 32px', background: NAVY }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white', margin: 0 }}>{scheme.provider}</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4, marginBottom: 0 }}>
              {scheme.schemeType}
              {scheme.policyNumber && <span> · {scheme.policyNumber}</span>}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'white' }}>{formatCurrency(scheme.currentValue)}</div>
            {scheme.transferValue && scheme.transferValue !== scheme.currentValue && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3, marginBottom: 0 }}>
                Transfer value: {formatCurrency(scheme.transferValue)}
              </p>
            )}
          </div>
        </div>
        {scheme.policyHolder && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 10, marginBottom: 0 }}>
            Policy holder: {scheme.policyHolder}
          </p>
        )}
      </div>

      {/* Charges */}
      {scheme.charges && (
        <>
          <div style={{ padding: '24px 32px', background: SECTION_BG }}>
            <SectionLabel>Charges</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px 24px' }}>
              {scheme.charges.amc !== undefined && (
                <div>
                  <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginBottom: 4 }}>AMC</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: TEXT_BODY }}>{pct(scheme.charges.amc)}</div>
                </div>
              )}
              {scheme.charges.platformCharge !== undefined && (
                <div>
                  <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginBottom: 4 }}>Platform</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: TEXT_BODY }}>{pct(scheme.charges.platformCharge)}</div>
                </div>
              )}
              {scheme.charges.fundCharges?.map((fc, i) => (
                <div key={i}>
                  <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginBottom: 4 }}>{fc.fund} OCF</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: TEXT_BODY }}>{pct(fc.ocf)}</div>
                </div>
              ))}
              {scheme.charges.totalCharge !== undefined && (
                <div>
                  <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginBottom: 4 }}>Total charge</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: (scheme.charges.totalCharge ?? 0) > 1.5 ? '#b45309' : TEXT_HEADING }}>
                    {pct(scheme.charges.totalCharge)}
                  </div>
                </div>
              )}
            </div>
          </div>
          <SectionDivider />
        </>
      )}

      {/* Fund information */}
      {scheme.funds && scheme.funds.length > 0 && (
        <>
          <div style={{ padding: '24px 32px' }}>
            <SectionLabel>Fund Information</SectionLabel>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Fund</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Allocation</th>
                  {scheme.funds.some(f => f.assetClass) && (
                    <th style={{ ...thStyle, textAlign: 'right' }}>Asset class</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {scheme.funds.map((fund, i) => (
                  <tr key={i}>
                    <td style={{ padding: '13px 0', color: TEXT_BODY, borderBottom: i < scheme.funds!.length - 1 ? `1px solid ${BORDER}` : 'none' }}>{fund.name}</td>
                    <td style={{ padding: '13px 0', textAlign: 'right', color: TEXT_BODY, fontWeight: 500, borderBottom: i < scheme.funds!.length - 1 ? `1px solid ${BORDER}` : 'none' }}>{fund.allocation}%</td>
                    {scheme.funds!.some(f => f.assetClass) && (
                      <td style={{ padding: '13px 0', textAlign: 'right', color: TEXT_SECONDARY, borderBottom: i < scheme.funds!.length - 1 ? `1px solid ${BORDER}` : 'none' }}>{fund.assetClass || '—'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SectionDivider />
        </>
      )}

      {/* Retirement options */}
      {isPension && scheme.retirementOptions && (
        <>
          <div style={{ padding: '24px 32px', background: SECTION_BG }}>
            <SectionLabel>Retirement Options</SectionLabel>
            <div>
              {[
                ['Drawdown', scheme.retirementOptions.drawdown],
                ['Annuity purchase', scheme.retirementOptions.annuity],
                ['Full encashment', scheme.retirementOptions.fullEncashment],
                ['Partial / UFPLS', scheme.retirementOptions.partialEncashment],
              ].map(([label, option], i) => (
                option !== undefined && (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 3 ? `1px solid ${BORDER}` : 'none' }}>
                    <span style={{ fontSize: 14, color: TEXT_BODY }}>{label as string}</span>
                    <OptionStatus option={option as RetirementOption} />
                  </div>
                )
              ))}
              {scheme.retirementOptions.minimumRetirementAge && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 14, color: TEXT_BODY }}>Minimum retirement age</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: TEXT_BODY }}>{scheme.retirementOptions.minimumRetirementAge}</span>
                </div>
              )}
            </div>
          </div>
          <SectionDivider />
        </>
      )}

      {/* Plan features */}
      {scheme.planFeatures && (
        <>
          <div style={{ padding: '24px 32px' }}>
            <SectionLabel>Plan Features</SectionLabel>
            <div>
              {scheme.planFeatures.nominatedBeneficiaries && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>Beneficiaries</span>
                  <span style={{ fontSize: 13, color: TEXT_BODY, textAlign: 'right', maxWidth: '60%' }}>{scheme.planFeatures.nominatedBeneficiaries}</span>
                </div>
              )}
              {scheme.planFeatures.trustStatus && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>Trust status</span>
                  <span style={{ fontSize: 13, color: TEXT_BODY }}>{scheme.planFeatures.trustStatus}</span>
                </div>
              )}
              {scheme.planFeatures.otherFeatures?.map((feat, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 13, color: TEXT_BODY }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>
          <SectionDivider />
        </>
      )}

      {/* Limiting factors — inside the card */}
      <div style={{ padding: '24px 32px' }}>
        <SectionLabel>Limiting Factors</SectionLabel>

        {(!scheme.limitingFactors || scheme.limitingFactors.length === 0) ? (
          <div style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 10, padding: '14px 18px' }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#16a34a', margin: 0 }}>
              No limiting factors identified from documents provided.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...scheme.limitingFactors]
              .sort((a, b) => (a.severity === 'red' ? -1 : 1) - (b.severity === 'red' ? -1 : 1))
              .map((factor, i) => (
                <LimitingFactorCallout key={i} factor={factor} />
              ))}
          </div>
        )}

        {/* Summary pill badges */}
        {hasLimiting && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
            {redCount > 0 && (
              <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: '#fee2e2', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                {redCount} red flag{redCount > 1 ? 's' : ''}
              </span>
            )}
            {amberCount > 0 && (
              <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: '#fffbeb', color: '#b45309', border: '1px solid rgba(217,119,6,0.2)' }}>
                {amberCount} amber flag{amberCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SchemeAssessmentRenderer({ data }: Props) {
  const { schemes } = data;

  if (!schemes || schemes.length === 0) {
    return <p style={{ color: TEXT_SECONDARY }}>No schemes to display.</p>;
  }

  // Table header style for comparative table
  const thStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase' as const, color: TEXT_SECONDARY,
    padding: '14px 16px', borderBottom: `1px solid ${BORDER}`,
    background: SECTION_BG,
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {schemes.map((scheme, i) => (
        <SchemeSection key={i} scheme={scheme} />
      ))}

      {/* Comparative summary */}
      {schemes.length > 1 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: TEXT_SECONDARY, marginBottom: 16 }}>
            Comparative Summary
          </div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Provider</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Type</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Value</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total charges</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Retirement options</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Limiting factors</th>
                </tr>
              </thead>
              <tbody>
                {schemes.map((scheme, i) => {
                  const amberCount = scheme.limitingFactors?.filter(f => f.severity === 'amber').length ?? 0;
                  const redCount = scheme.limitingFactors?.filter(f => f.severity === 'red').length ?? 0;
                  const isPension = scheme.schemeType?.toLowerCase().includes('pension');
                  const rowBg = i % 2 === 0 ? 'white' : SECTION_BG;

                  let retSummary = '—';
                  if (isPension && scheme.retirementOptions) {
                    const opts = scheme.retirementOptions;
                    const available: string[] = [];
                    if (opts.drawdown?.available) available.push('Drawdown');
                    if (opts.annuity?.available) available.push('Annuity');
                    if (opts.fullEncashment?.available) available.push('Encashment');
                    if (opts.partialEncashment?.available) available.push('UFPLS');
                    retSummary = available.length > 0 ? available.join(', ') : 'Check with provider';
                  }

                  const worstFlag = redCount > 0
                    ? scheme.limitingFactors?.find(f => f.severity === 'red')?.description
                    : scheme.limitingFactors?.[0]?.description;

                  return (
                    <tr key={i} style={{ background: rowBg }}>
                      <td style={{ padding: '15px 16px', color: TEXT_HEADING, fontWeight: 500, borderBottom: `1px solid ${BORDER}`, height: 52 }}>{scheme.provider}</td>
                      <td style={{ padding: '15px 16px', color: TEXT_SECONDARY, borderBottom: `1px solid ${BORDER}` }}>{scheme.schemeType}</td>
                      <td style={{ padding: '15px 16px', textAlign: 'right', color: TEXT_HEADING, fontWeight: 500, borderBottom: `1px solid ${BORDER}` }}>{formatCurrency(scheme.currentValue)}</td>
                      <td style={{ padding: '15px 16px', textAlign: 'right', color: (scheme.charges?.totalCharge ?? 0) > 1.5 ? '#b45309' : TEXT_BODY, borderBottom: `1px solid ${BORDER}` }}>
                        {scheme.charges?.totalCharge ? pct(scheme.charges.totalCharge) : '—'}
                      </td>
                      <td style={{ padding: '15px 16px', color: TEXT_SECONDARY, borderBottom: `1px solid ${BORDER}` }}>{retSummary}</td>
                      <td style={{ padding: '15px 16px', borderBottom: `1px solid ${BORDER}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {redCount > 0 && (
                            <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: '#fee2e2', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                              {redCount} red
                            </span>
                          )}
                          {amberCount > 0 && (
                            <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: '#fffbeb', color: '#b45309', border: '1px solid rgba(217,119,6,0.2)' }}>
                              {amberCount} amber
                            </span>
                          )}
                          {redCount === 0 && amberCount === 0 && (
                            <span style={{ fontSize: 12, color: '#16a34a' }}>None</span>
                          )}
                          {worstFlag && (
                            <span style={{ fontSize: 11, color: TEXT_SECONDARY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{worstFlag}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
