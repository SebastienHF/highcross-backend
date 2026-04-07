import { useState, useEffect } from 'react';
import type { Artifact } from '../types';
import { getArtifactLabel } from '../parseArtifacts';
import ArtifactContent from './ArtifactContent';

const NAVY   = '#1a3a5c';
const BORDER = '#e5e7eb';
const TXT_HEAD = '#1a1a2e';
const TXT_MID  = '#6b7280';

const PRESENTATIONAL_TYPES = ['scheme_assessment'];

interface Props {
  artifact: Artifact;
  clientName: string;
  onClose: () => void;
  onSaveToFile: (artifactId: string) => void;
  onConfirm: (artifactId: string) => void;
  onUnconfirm: (artifactId: string) => void;
}

export default function ArtifactEditor({
  artifact,
  clientName,
  onClose,
  onSaveToFile,
  onConfirm,
  onUnconfirm,
}: Props) {
  const [current] = useState<Artifact>(artifact);
  const [savedToFile, setSavedToFile] = useState(artifact.savedToFile ?? false);

  // Prevent background scroll while overlay is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function handleSaveToFile() {
    onSaveToFile(current.id);
    setSavedToFile(true);
  }

  function handleConfirm() {
    onConfirm(current.id);
    onClose();
  }

  function handleUnconfirm() {
    onUnconfirm(current.id);
  }

  function handlePrint() {
    const clientInitials = clientName.split(' ').map(w => w[0]?.toUpperCase() || '').join('').slice(0, 2);
    localStorage.setItem('hf_output_viewer', JSON.stringify({ artifact: current, clientName, clientInitials }));
    window.open('/output', '_blank');
  }

  const isPresentation = PRESENTATIONAL_TYPES.includes(current.type);
  const label = getArtifactLabel(current.type);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'white', display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* Header */}
      <div style={{
        flexShrink: 0, height: 52,
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', background: '#fafafa',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: NAVY }}>
            Highcross Financial
          </span>
          <span style={{ color: BORDER }}>·</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: TXT_HEAD }}>{label}</span>
          {clientName && (
            <>
              <span style={{ color: BORDER }}>·</span>
              <span style={{ fontSize: 12, color: TXT_MID }}>{clientName}</span>
            </>
          )}
          {(current.version ?? 1) > 1 && (
            <span style={{ fontSize: 10, color: TXT_MID, background: '#f3f4f6', padding: '2px 8px', borderRadius: 9999 }}>
              v{current.version}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handlePrint}
            style={{ padding: '5px 12px', fontSize: 12, color: TXT_MID, background: 'white', border: `1px solid ${BORDER}`, borderRadius: 6, cursor: 'pointer' }}
          >
            Print
          </button>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: TXT_MID, fontSize: 18, lineHeight: 1 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Full-width artifact content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 48px' }}>
        <ArtifactContent artifact={current} />
      </div>

      {/* Footer action bar */}
      <div style={{
        flexShrink: 0, borderTop: `1px solid ${BORDER}`,
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#fafafa',
      }}>
        <button
          onClick={onClose}
          style={{ fontSize: 12, color: TXT_MID, background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 4px' }}
        >
          ← Back
        </button>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={handleSaveToFile}
            style={{
              padding: '8px 18px', fontSize: 12, fontWeight: 500, borderRadius: 8,
              border: `1px solid ${savedToFile ? '#16a34a' : BORDER}`,
              background: savedToFile ? '#f0fdf4' : 'white',
              color: savedToFile ? '#16a34a' : TXT_HEAD,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {savedToFile ? '✓ On case file' : 'Add to case file'}
          </button>

          {!isPresentation && (
            current.confirmed ? (
              <button
                onClick={handleUnconfirm}
                style={{
                  padding: '8px 18px', fontSize: 12, fontWeight: 500, borderRadius: 8,
                  border: '1px solid #d1fae5', background: '#f0fdf4', color: '#16a34a',
                  cursor: 'pointer',
                }}
              >
                ✓ Confirmed — Undo
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                style={{
                  padding: '8px 18px', fontSize: 12, fontWeight: 500, borderRadius: 8,
                  border: 'none', background: '#16a34a', color: 'white',
                  cursor: 'pointer',
                }}
              >
                Confirm recommendation
              </button>
            )
          )}
        </div>
      </div>

    </div>
  );
}
