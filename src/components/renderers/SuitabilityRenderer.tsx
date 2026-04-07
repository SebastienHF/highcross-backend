interface Props {
  content: string;
}

const TEXT_HEADING = '#1a1a2e';
const TEXT_BODY = '#374151';
const TEXT_SECONDARY = '#6b7280';
const TEXT_DISCLOSURE = '#9ca3af';
const BORDER = '#e5e7eb';
const NAVY = '#1a3a5c';
const SECTION_BG = '#f9fafb';

const DISCLOSURE_KEYWORDS = [
  'past performance', 'this report is', 'this is not a recommendation',
  'regulatory', 'authorised and regulated', 'financial conduct authority',
  'not constitute', 'for information only', 'important information',
  'disclaimer', 'fca register',
];

interface ParsedSection {
  title: string;
  level: number;
  id: string;
  content: string;
  isDisclosure: boolean;
}

function makeId(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/, '');
}

function isDisclosure(title: string, content: string): boolean {
  const t = (title + ' ' + content).toLowerCase();
  return DISCLOSURE_KEYWORDS.some(k => t.includes(k));
}

function parseSections(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;
  let pre = '';

  for (const line of text.split('\n')) {
    const h1 = line.match(/^# (.+)$/);
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);

    if (h1 || h2 || h3) {
      if (current) {
        current.isDisclosure = isDisclosure(current.title, current.content);
        sections.push(current);
      } else if (pre.trim()) {
        sections.push({ title: '', level: 0, id: 'intro', content: pre.trim(), isDisclosure: false });
      }
      const title = (h1 ?? h2 ?? h3)![1];
      const level = h1 ? 1 : h2 ? 2 : 3;
      current = { title, level, id: makeId(title), content: '', isDisclosure: false };
    } else {
      if (current) current.content += line + '\n';
      else pre += line + '\n';
    }
  }

  if (current) {
    current.isDisclosure = isDisclosure(current.title, current.content);
    sections.push(current);
  } else if (pre.trim()) {
    sections.push({ title: '', level: 0, id: 'intro', content: pre.trim(), isDisclosure: false });
  }

  return sections;
}

function renderBody(text: string, small = false): string {
  const size = small ? 12 : 15;
  const color = small ? TEXT_DISCLOSURE : TEXT_BODY;
  const lineH = small ? 1.6 : 1.75;
  const mb = small ? 8 : 18;

  let html = text
    .replace(/```([\s\S]*?)```/g, `<pre style="background:#f3f4f6;padding:16px;border-radius:8px;font-size:12px;font-family:monospace;overflow-x:auto;margin:0 0 ${mb}px"><code>$1</code></pre>`)
    .replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px;font-family:monospace">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, `<strong style="font-weight:600;color:${TEXT_HEADING}">$1</strong>`)
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, `<li style="margin-bottom:6px">$1</li>`)
    .replace(/^(\d+)\. (.+)$/gm, `<li style="margin-bottom:6px">$2</li>`);

  // Wrap loose <li> runs in <ul>
  html = html.replace(/((?:<li[^>]*>[^<]*<\/li>\n?)+)/g, match => {
    return `<ul style="margin:0 0 ${mb}px;padding-left:22px;list-style-type:disc">${match}</ul>`;
  });

  // Paragraphs
  html = html
    .replace(/\n\n+/g, `</p><p style="margin:0 0 ${mb}px;line-height:${lineH};color:${color};font-size:${size}px">`)
    .replace(/\n/g, '<br>');

  return `<p style="margin:0 0 ${mb}px;line-height:${lineH};color:${color};font-size:${size}px">${html}</p>`;
}

export default function SuitabilityRenderer({ content }: Props) {
  const sections = parseSections(content);
  const navSections = sections.filter(s => s.title && s.level <= 2 && !s.isDisclosure);
  const mainSections = sections.filter(s => !s.isDisclosure);
  const disclosureSections = sections.filter(s => s.isDisclosure);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Table of contents */}
      {navSections.length > 2 && (
        <div style={{
          background: SECTION_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          padding: '18px 24px',
          marginBottom: 40,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: TEXT_SECONDARY, marginBottom: 12 }}>
            Contents
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navSections.map((s, i) => (
              <a
                key={i}
                href={`#${s.id}`}
                onClick={e => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }); }}
                style={{
                  fontSize: 13,
                  color: NAVY,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  paddingLeft: s.level === 3 ? 16 : 0,
                }}
              >
                <span style={{ fontSize: 10, color: BORDER, flexShrink: 0 }}>▸</span>
                {s.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Main sections */}
      {mainSections.map((section, i) => (
        <div key={i} id={section.id} style={{ marginBottom: 40 }}>
          {section.title && (
            section.level <= 2 ? (
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                color: TEXT_SECONDARY,
                paddingBottom: 10,
                borderBottom: `1px solid ${BORDER}`,
                marginBottom: 20,
              }}>
                {section.title}
              </div>
            ) : (
              <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_HEADING, marginBottom: 12 }}>
                {section.title}
              </div>
            )
          )}
          <div
            style={{ maxWidth: 680 }}
            dangerouslySetInnerHTML={{ __html: renderBody(section.content) }}
          />
        </div>
      ))}

      {/* Regulatory disclosure */}
      {disclosureSections.length > 0 && (
        <>
          <div style={{ height: 1, background: BORDER, margin: '40px 0 32px' }} />
          {disclosureSections.map((section, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              {section.title && (
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: TEXT_DISCLOSURE, marginBottom: 10 }}>
                  {section.title}
                </div>
              )}
              <div
                style={{ maxWidth: 680 }}
                dangerouslySetInnerHTML={{ __html: renderBody(section.content, true) }}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
