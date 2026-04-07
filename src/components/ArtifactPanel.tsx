import type { Artifact } from '../types';
import { getArtifactLabel } from '../parseArtifacts';

interface Props {
  artifacts: Artifact[];
  clientName: string;
  onOpen: (artifact: Artifact) => void;
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'cashflow':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'presentation':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21l4-4m0 0l4 4m-4-4V3m-4 4h8a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z" />
        </svg>
      );
    case 'email':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'suitability_report':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'scheme_assessment':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'cashflow': return 'text-blue-500 bg-blue-50';
    case 'presentation': return 'text-purple-500 bg-purple-50';
    case 'email': return 'text-amber-500 bg-amber-50';
    case 'suitability_report': return 'text-emerald-500 bg-emerald-50';
    case 'scheme_assessment': return 'text-cyan-600 bg-cyan-50';
    default: return 'text-gray-500 bg-gray-50';
  }
}

function StatusBadge({ artifact }: { artifact: Artifact }) {
  if (artifact.confirmed) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Confirmed
      </span>
    );
  }
  if (artifact.savedToFile) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-medium">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        On case file
      </span>
    );
  }
  return <span className="text-[10px] text-gray-400">Draft</span>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ArtifactPanel({ artifacts, clientName: _clientName, onOpen }: Props) {
  const displayArtifacts = artifacts.filter(a => a.type !== 'fact_find_update');

  if (displayArtifacts.length === 0) {
    return (
      <div className="w-[280px] bg-[#eeeee8] flex flex-col shrink-0 shadow-[-1px_0_0_0_rgba(0,0,0,0.06),-4px_0_12px_-2px_rgba(0,0,0,0.04)]">
        <div className="px-6 pt-7 pb-5 border-b border-black/[0.06]">
          <h2 className="text-[9px] font-semibold text-gray-400 uppercase tracking-[0.2em]">Outputs</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-black/[0.03] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Generated outputs will<br />appear here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[280px] bg-[#eeeee8] flex flex-col shrink-0 shadow-[-1px_0_0_0_rgba(0,0,0,0.06),-4px_0_12px_-2px_rgba(0,0,0,0.04)]">
      <div className="px-6 pt-7 pb-5 border-b border-black/[0.06]">
        <h2 className="text-[9px] font-semibold text-gray-400 uppercase tracking-[0.2em]">Outputs</h2>
        <p className="text-[10px] text-gray-400 mt-1">{displayArtifacts.length} generated</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 light-scroll">
        {displayArtifacts.map(artifact => {
          const label = getArtifactLabel(artifact.type);
          const colorClass = getTypeColor(artifact.type);
          const [iconColor, iconBg] = colorClass.split(' ');

          return (
            <button
              key={artifact.id}
              onClick={() => onOpen(artifact)}
              className="w-full text-left bg-white rounded-xl border border-black/[0.05] shadow-sm hover:shadow-md hover:border-black/[0.08] transition-all duration-150 overflow-hidden group"
            >
              <div className="px-4 py-3.5 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0 mt-0.5`}>
                  {getTypeIcon(artifact.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-gray-800 truncate">{label}</span>
                    {(artifact.version ?? 1) > 1 && (
                      <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">v{artifact.version}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                    {artifact.createdAt
                      ? new Date(artifact.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : artifact.content.slice(0, 40).replace(/[#*_\n]/g, ' ').trim() + '...'}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <StatusBadge artifact={artifact} />
                    <span className="text-[10px] text-gray-300">·</span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Open
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" style={{ transform: 'rotate(180deg)', transformOrigin: 'center' }} />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
