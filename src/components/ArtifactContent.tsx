import type { Artifact } from '../types';
import type { ClientPresentation } from '../types';
import PresentationRenderer from './renderers/PresentationRenderer';
import EmailRenderer from './renderers/EmailRenderer';
import SuitabilityRenderer from './renderers/SuitabilityRenderer';
import SchemeAssessmentRenderer from './renderers/SchemeAssessmentRenderer';
import CashflowRenderer from './renderers/CashflowRenderer';
import type { CashflowData } from './renderers/CashflowRenderer';
import MarkdownRenderer from './renderers/MarkdownRenderer';

export default function ArtifactContent({ artifact }: { artifact: Artifact }) {
  if (artifact.type === 'presentation' && artifact.structuredData) {
    return <PresentationRenderer data={artifact.structuredData as ClientPresentation} />;
  }
  if (artifact.type === 'cashflow' && artifact.structuredData) {
    return <CashflowRenderer data={artifact.structuredData as CashflowData} />;
  }
  if (artifact.type === 'email') {
    return <EmailRenderer content={artifact.content} />;
  }
  if (artifact.type === 'suitability_report') {
    return <SuitabilityRenderer content={artifact.content} />;
  }
  if (artifact.type === 'scheme_assessment' && artifact.structuredData) {
    return <SchemeAssessmentRenderer data={artifact.structuredData as Parameters<typeof SchemeAssessmentRenderer>[0]['data']} />;
  }
  return <MarkdownRenderer content={artifact.content} />;
}
