import type { Artifact } from './types';

const ARTIFACT_REGEX = /<artifact\s+type="([^"]+)">([\s\S]*?)<\/artifact>/g;

const TYPE_LABELS: Record<string, string> = {
  suitability_report: 'Suitability Report',
  client_summary: 'Client Summary',
  presentation: 'Client Presentation',
  processing_schema: 'Processing Schema',
  loa_document: 'LOA Handover Document',
  email: 'Email Draft',
  scheme_assessment: 'Scheme Assessment',
  cashflow: 'Cashflow Model',
};

export function getArtifactLabel(type: string): string {
  return TYPE_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function tryParseJSON(raw: string): unknown | undefined {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const slice = (firstBrace !== -1 && lastBrace > firstBrace)
    ? cleaned.slice(firstBrace, lastBrace + 1)
    : cleaned;

  try {
    const parsed = JSON.parse(slice);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch {
    try {
      const sanitised = slice
        .replace(/\r\n/g, '\\n')
        .replace(/\r/g, '\\n')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t');
      const parsed = JSON.parse(sanitised);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    } catch (e2) {
      console.warn('[parseArtifacts] JSON parse failed.', (e2 as Error).message);
    }
  }

  return undefined;
}

export function parseArtifacts(content: string): {
  cleanContent: string;
  artifacts: Artifact[];
} {
  const artifacts: Artifact[] = [];
  let match;

  while ((match = ARTIFACT_REGEX.exec(content)) !== null) {
    const rawContent = match[2].trim();
    const structuredData = tryParseJSON(rawContent);

    artifacts.push({
      id: `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: match[1],
      content: rawContent,
      structuredData,
      confirmed: false,
      createdAt: new Date().toISOString(),
      version: 1,
    });
  }

  let cleanContent = content.replace(ARTIFACT_REGEX, '').trim();

  // Fallback: handle unclosed artifact tags (response truncated before </artifact>)
  if (artifacts.length === 0) {
    const unclosedMatch = /<artifact\s+type="([^"]+)">([\s\S]+)$/.exec(content);
    if (unclosedMatch) {
      const rawContent = unclosedMatch[2].trim();
      const structuredData = tryParseJSON(rawContent);
      if (structuredData !== undefined) {
        artifacts.push({
          id: `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: unclosedMatch[1],
          content: rawContent,
          structuredData,
          confirmed: false,
          createdAt: new Date().toISOString(),
          version: 1,
        });
        cleanContent = content.replace(/<artifact\s+type="[^"]+">[\s\S]+$/, '').trim();
      }
    }
  }

  // Fallback: model forgot artifact tags — detect JSON with known structure
  if (artifacts.length === 0) {
    const firstBrace = cleanContent.indexOf('{');
    const lastBrace = cleanContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const jsonSlice = cleanContent.slice(firstBrace, lastBrace + 1);
      const json = tryParseJSON(jsonSlice) as Record<string, unknown> | undefined;
      if (json && typeof json === 'object' && !Array.isArray(json)) {
        const type = Array.isArray(json.schemes) ? 'scheme_assessment'
                   : json.sourceAssets != null   ? 'presentation'
                   : null;
        if (type) {
          artifacts.push({
            id: `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type,
            content: jsonSlice,
            structuredData: json,
            confirmed: false,
            createdAt: new Date().toISOString(),
            version: 1,
          });
          cleanContent = cleanContent.slice(0, firstBrace).trim();
        }
      }
    }
  }

  return { cleanContent, artifacts };
}
