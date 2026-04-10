// Fixed fact find categories — regulatory requirements.
// Content is freeform text determined by the AI from conversation.
export const FACT_FIND_CATEGORIES = [
  'Date of Birth',
  'National Insurance',
  'Tax Position',
  'Employment',
  'Marital Status',
  'Dependents',
  'Property',
  'Cash Holdings',
  'Pensions',
  'ISAs',
  'Other Investments',
  'Protection',
  'Liabilities',
  'Income & Expenditure',
  'Risk Profile',
  'ESG Preferences',
] as const;

export type FactFindCategory = typeof FACT_FIND_CATEGORIES[number];

export interface ClientData {
  id: string;
  name: string;
  initials: string;
  factFind: Record<string, string>;
  softKnowledge: string;
  confirmedRecommendations: Recommendation[];
  openItems: string[];
  savedArtifacts: Artifact[];
  savedMessages: ChatMessage[];
}

export interface Recommendation {
  type: string;
  summary: string;
  confirmedAt: string;
}

export interface Artifact {
  id: string;
  type: string;
  content: string;
  structuredData?: unknown;
  confirmed: boolean;
  confirmedAt?: string;
  savedToFile?: boolean;
  savedToFileAt?: string;
  createdAt: string;
  version?: number;
  supersedes?: string;
}

export interface DocumentAttachment {
  id: string;
  name: string;
  base64: string;
  mediaType: string;
}

export interface ToolUseIndicator {
  name: string;
  input: Record<string, unknown>;
  result?: string;
}

export interface ConfirmationRequest {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  summary: string;
  status: 'pending' | 'confirmed' | 'declined';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  artifacts?: Artifact[];
  documents?: DocumentAttachment[];
  timestamp: string;
  toolUses?: ToolUseIndicator[];
  confirmationRequests?: ConfirmationRequest[];
}

// Client presentation types

export interface SourceAsset {
  name: string;
  value?: number;
  notes?: string;
}

export interface RetainedAsset {
  name: string;
  value?: number;
  notes?: string; // e.g. "DB pension — £8,000 p.a. — not transferred"
}

export interface PlanPhase {
  title: string;   // e.g. "Phase 2 — Next tax year"
  actions: string[];
}

export interface WrapperAllocation {
  wrapperType: string; // 'Pension' | 'ISA' | 'GIA' | 'LISA' | 'Bond' | etc.
  provider: string;
  platform?: string;   // if different from top-level targetPlatform
  actions: string[];
  initialValue: number;
  futureValue?: number;
  futureNotes?: string;
  funds: { name: string; percentage?: number }[];
}

export interface ClientPresentation {
  slideOneTitle: string;
  sourceAssets: SourceAsset[];
  targetPlatform: string;           // primary platform label
  targetPlatforms?: string[];       // use when wrappers span multiple platforms
  wrapperAllocations: WrapperAllocation[];
  retainedAssets?: RetainedAsset[]; // stays put — shown separately, no arrow
  phases?: PlanPhase[];             // phased / multi-year actions
  nextYearAction?: string;          // legacy single-line phase note
  slideTwoTitle: string;
  incomeTarget?: string;
  slideThreeTitle: string;
  clientName: string;
  generatedAt: string;
}
