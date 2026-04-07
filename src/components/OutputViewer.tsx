import { useState, useEffect } from 'react';
import type { Artifact } from '../types';
import { getArtifactLabel } from '../parseArtifacts';
import ArtifactContent from './ArtifactContent';

const STORAGE_KEY = 'hf_output_viewer';
const NAVY = '#1a3a5c';
const GOLD = '#c9a84c';
const BORDER = '#e5e7eb';

export default function OutputViewer() {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientInitials, setClientInitials] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setArtifact(data.artifact);
        setClientName(data.clientName || '');
        setClientInitials(
          data.clientInitials ||
          (data.clientName || '').split(' ').map((w: string) => w[0]?.toUpperCase() || '').join('').slice(0, 2)
        );
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // corrupt data
    }
  }, []);

  if (!artifact) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <p style={{ color: '#6b7280', fontSize: 14 }}>No output to display.</p>
      </div>
    );
  }

  const label = getArtifactLabel(artifact.type);
  const dateStr = artifact.confirmedAt
    ? new Date(artifact.confirmedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: 'white', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Slim utility bar — hidden when printing */}
      <div className="print:hidden" style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f9fafb', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 896, margin: '0 auto', padding: '10px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: NAVY }}>
              Highcross Financial
            </span>
            <span style={{ color: BORDER }}>·</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {artifact.confirmed && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 999, background: '#f0fdf4', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }}>
                <svg width="10" height="10" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Confirmed
              </span>
            )}
            <button
              onClick={() => window.print()}
              style={{ padding: '6px 16px', background: NAVY, color: 'white', fontSize: 12, fontWeight: 500, borderRadius: 8, border: 'none', cursor: 'pointer' }}
            >
              Print / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Document content */}
      <div
        className={artifact.type === 'presentation' ? 'ov-content ov-content--presentation' : 'ov-content'}
        style={{ maxWidth: artifact.type === 'cashflow' ? 1440 : 896, margin: '0 auto', padding: artifact.type === 'cashflow' ? '48px 32px 60px' : '48px 48px 60px' }}
      >
        {/* Premium document header — hidden in print for presentations (they have their own) */}
        <div className="ov-doc-header" style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: NAVY,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'white', letterSpacing: '0.04em' }}>
                {clientInitials || 'HF'}
              </span>
            </div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.2, margin: 0 }}>
                {label}
              </h1>
              <p style={{ fontSize: 14, color: '#6b7280', marginTop: 5, marginBottom: 0 }}>
                {clientName}{clientName ? ' · ' : ''}{dateStr}
              </p>
            </div>
          </div>
          {/* Gold rule */}
          <div style={{ height: 1, background: GOLD }} />
        </div>

        <ArtifactContent artifact={artifact} />

        {/* Print-only footer — not shown for presentations (each slide has its own footer) */}
        <div className="ov-print-footer hidden print:block" style={{ marginTop: 48, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 10, color: '#9ca3af' }}>
            Generated by Highcross Financial Agentic Back-End · {dateStr} · For professional use only
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          /* Presentations handle their own layout — strip the OutputViewer chrome */
          .ov-content--presentation {
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .ov-content--presentation .ov-doc-header {
            display: none !important;
          }
          .ov-content--presentation .ov-print-footer {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
