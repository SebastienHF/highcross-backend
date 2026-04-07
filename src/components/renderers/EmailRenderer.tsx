interface Props {
  content: string;
}

const TEXT_HEADING = '#1a1a2e';
const TEXT_BODY = '#374151';
const TEXT_SECONDARY = '#6b7280';
const BORDER = '#e5e7eb';
const SECTION_BG = '#f9fafb';

function renderEmailContent(text: string): string {
  let html = text
    .replace(/\*\*([^*]+)\*\*/g, `<strong style="font-weight:600;color:${TEXT_HEADING}">$1</strong>`)
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;gap:10px;margin-bottom:6px"><span style="color:#9ca3af;min-width:16px">$1.</span><span>$2</span></div>')
    .replace(/^- (.+)$/gm, '<div style="display:flex;gap:10px;margin-bottom:6px"><span style="color:#9ca3af">·</span><span>$1</span></div>');

  return html;
}

export default function EmailRenderer({ content }: Props) {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Email header bar */}
      <div style={{ background: SECTION_BG, border: `1px solid ${BORDER}`, borderRadius: '10px 10px 0 0', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="16" height="16" fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: TEXT_SECONDARY }}>
          Email Draft
        </span>
      </div>

      {/* Email body */}
      <div
        style={{
          border: `1px solid ${BORDER}`,
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          padding: '28px 28px 32px',
          background: 'white',
          fontSize: 15,
          lineHeight: 1.75,
          color: TEXT_BODY,
          whiteSpace: 'pre-line',
        }}
        dangerouslySetInnerHTML={{ __html: renderEmailContent(content) }}
      />
    </div>
  );
}
