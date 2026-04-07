import { useState, useRef, useEffect, useCallback } from 'react';
import type { ClientData, ChatMessage, DocumentAttachment } from '../types';
import { parseArtifacts } from '../parseArtifacts';
import { getArtifactLabel } from '../parseArtifacts';
import { parseExcelToText } from '../cashflowApi';

interface PendingExcel {
  filename: string;
  text: string;
}

interface Props {
  client: ClientData | null;
  messages: ChatMessage[];
  isLoading: boolean;
  sessionDocuments: DocumentAttachment[];
  onSendMessage: (content: string, documents?: DocumentAttachment[]) => void;
  onAddDocuments: (documents: DocumentAttachment[]) => void;
  onDeleteMessage: (index: number) => void;
}

function parseUserContent(content: string): { text: string; excelFilename: string | null } {
  const match = content.match(/\[CASHFLOW SPREADSHEET: ([^\]]+)\][\s\S]*?\[END SPREADSHEET\]/);
  if (!match) return { text: content, excelFilename: null };
  return {
    text: content.replace(/\n*\[CASHFLOW SPREADSHEET: [^\]]+\][\s\S]*?\[END SPREADSHEET\]/, '').trim(),
    excelFilename: match[1],
  };
}

const THINKING_PHRASES = [
  'Reviewing client profile',
  'Analysing financial position',
  'Considering tax implications',
  'Evaluating wrapper options',
  'Checking regulatory requirements',
  'Running the numbers',
  'Assessing risk profile',
  'Structuring recommendations',
  'Cross-referencing fact find',
  'Drafting response',
  'Synthesising findings',
  'Optimising strategy',
  'Reviewing FCA guidelines',
  'Calculating projections',
  'Weighing up options',
];

function renderMarkdown(text: string): string {
  let html = text
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  html = html.replace(/(<li>.*?<\/li>)(?:\s*<br\/>)?/gs, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  return `<p>${html}</p>`;
}

function ThinkingIndicator() {
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    setPhraseIdx(Math.floor(Math.random() * THINKING_PHRASES.length));
    const interval = setInterval(() => {
      setPhraseIdx(prev => (prev + 1) % THINKING_PHRASES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex items-start gap-3.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
          <svg className="w-3.5 h-3.5 text-white thinking-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div className="py-2">
          <p className="text-[13px] text-gray-400 thinking-text" key={phraseIdx}>
            {THINKING_PHRASES[phraseIdx]}
            <span className="thinking-ellipsis" />
          </p>
        </div>
      </div>
    </div>
  );
}

async function filesToDocuments(files: FileList | File[]): Promise<DocumentAttachment[]> {
  const docs: DocumentAttachment[] = [];
  for (const file of Array.from(files)) {
    if (file.type !== 'application/pdf') continue;
    const buffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    docs.push({
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      base64,
      mediaType: 'application/pdf',
    });
  }
  return docs;
}

const BG = '#f5f5f0';

export default function ChatPanel({ client, messages, isLoading, sessionDocuments, onSendMessage, onAddDocuments, onDeleteMessage }: Props) {
  const [input, setInput] = useState('');
  const [pendingDocs, setPendingDocs] = useState<DocumentAttachment[]>([]);
  const [pendingExcel, setPendingExcel] = useState<PendingExcel | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredMsgIdx, setHoveredMsgIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dragCountRef = useRef(0);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSubmit = () => {
    if ((!input.trim() && pendingDocs.length === 0 && !pendingExcel) || isLoading) return;
    let message = input.trim();
    if (!message && pendingDocs.length > 0) message = `Please review the attached document${pendingDocs.length > 1 ? 's' : ''}.`;
    if (!message && pendingExcel) message = 'I have attached a cashflow spreadsheet.';
    if (pendingExcel) {
      message += `\n\n[CASHFLOW SPREADSHEET: ${pendingExcel.filename}]\n${pendingExcel.text}\n[END SPREADSHEET]`;
    }
    onSendMessage(message, pendingDocs.length > 0 ? pendingDocs : undefined);
    setInput('');
    setPendingDocs([]);
    setPendingExcel(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCountRef.current = 0;

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    // Separate Excel files from PDFs
    const excelFiles = Array.from(files).filter(f =>
      f.name.toLowerCase().endsWith('.xlsx') || f.name.toLowerCase().endsWith('.xls')
    );
    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');

    if (excelFiles.length > 0) {
      const file = excelFiles[0]; // take the first Excel
      const buffer = await file.arrayBuffer();
      const base64 = btoa(new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), ''));
      const text = parseExcelToText(base64);
      setPendingExcel({ filename: file.name, text });
    }

    if (pdfFiles.length > 0) {
      const docs = await filesToDocuments(pdfFiles);
      if (docs.length > 0) {
        setPendingDocs(prev => [...prev, ...docs]);
        onAddDocuments(docs);
      }
    }
  }, [onAddDocuments]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current <= 0) {
      setIsDragging(false);
      dragCountRef.current = 0;
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const removePendingDoc = (id: string) => {
    setPendingDocs(prev => prev.filter(d => d.id !== id));
  };

  if (!client) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-black/[0.03] flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-base font-medium text-gray-600 mb-1">Select a client</h2>
          <p className="text-sm text-gray-400">Choose a client from the sidebar to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col min-w-0 relative"
      style={{ background: BG }}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
    >
      {/* Drop zone overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-20 bg-blue-50/80 backdrop-blur-sm border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <svg className="w-12 h-12 text-blue-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-blue-600">Drop files here</p>
            <p className="text-xs text-blue-400 mt-1">PDF documents or Excel cashflow spreadsheets (.xlsx)</p>
          </div>
        </div>
      )}

      {/* Messages — scrollable */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-10 pt-8 pb-64 light-scroll">
        {/* Client context pill */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-3 bg-white border border-black/[0.06] rounded-full px-5 py-2.5 shadow-sm">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-semibold">
              {client.initials}
            </div>
            <span className="text-sm font-medium text-gray-700">{client.name}</span>
            <span className="mx-1 w-px h-4 bg-black/[0.08]" />
            <span className="text-xs text-gray-400">
              {[client.factFind['Employment'], client.factFind['Tax Position']].filter(Boolean).join(' · ').slice(0, 50) || 'New client'}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1" />
          </div>
        </div>

        {/* Session documents indicator */}
        {sessionDocuments.length > 0 && (
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5">
              <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="text-[11px] text-blue-600 font-medium">
                {sessionDocuments.length} document{sessionDocuments.length > 1 ? 's' : ''} ingested
              </span>
              <span className="text-[10px] text-blue-400">
                {sessionDocuments.map(d => d.name).join(', ')}
              </span>
            </div>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center py-20 animate-fade-in">
            <p className="text-sm text-gray-400 mb-6">
              Start a conversation about {client.name}
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center max-w-xl">
              {[
                `Summarise ${client.name.split(' ')[0]}'s current position`,
                `What pathway applies for ${client.name.split(' ')[0]}?`,
                `Flag any gaps in the fact find`,
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => onSendMessage(suggestion)}
                  className="px-5 py-2.5 text-[13px] text-gray-500 bg-white border border-black/[0.07] rounded-full hover:bg-white hover:text-gray-700 hover:border-black/[0.12] hover:shadow-sm transition-all duration-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto">
          {messages.map((msg, i) => {
            // During streaming the last assistant message grows chunk by chunk.
            // Strip partial <artifact> tags AND raw JSON (model forgot tags) from the display.
            const isStreamingThisMsg = isLoading && i === messages.length - 1 && msg.role === 'assistant';
            const baseContent = isStreamingThisMsg
              ? msg.content.replace(/<artifact\b[\s\S]*/, '')
              : msg.content;
            // If a large JSON block is streaming in without artifact tags, suppress it —
            // parseArtifacts will auto-extract it once streaming completes.
            const rawJsonStreaming = isStreamingThisMsg && (() => {
              const t = baseContent;
              const braceIdx = t.indexOf('{');
              return braceIdx !== -1 && (t.length - braceIdx) > 80;
            })();
            const contentForParsing = rawJsonStreaming
              ? baseContent.slice(0, baseContent.indexOf('{')).trimEnd()
              : baseContent;

            const { cleanContent, artifacts } = msg.role === 'assistant'
              ? parseArtifacts(contentForParsing)
              : { cleanContent: msg.content, artifacts: [] };

            const isHovered = hoveredMsgIdx === i;

            return (
              <div
                key={i}
                className={`mb-6 animate-fade-in relative ${msg.role === 'user' ? 'flex justify-end' : ''}`}
                onMouseEnter={() => setHoveredMsgIdx(i)}
                onMouseLeave={() => setHoveredMsgIdx(null)}
              >
                {/* Delete button — visible on hover */}
                {isHovered && !isStreamingThisMsg && (
                  <button
                    onClick={() => onDeleteMessage(i)}
                    title="Remove from context"
                    style={{
                      position: 'absolute',
                      top: 0,
                      [msg.role === 'user' ? 'left' : 'right']: msg.role === 'user' ? 0 : -28,
                      width: 22, height: 22,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'white', border: '1px solid #e5e7eb',
                      borderRadius: 6, cursor: 'pointer', color: '#9ca3af',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                    className="hover:text-red-400 hover:border-red-200 transition-colors"
                  >
                    <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                {msg.role === 'user' ? (() => {
                  const { text: displayText, excelFilename } = parseUserContent(msg.content);
                  return (
                  <div className="max-w-[75%]">
                    {displayText && (
                      <div className="bg-white text-gray-800 px-5 py-3.5 rounded-2xl rounded-br-sm text-sm leading-relaxed shadow-sm border border-black/[0.04]">
                        {displayText}
                      </div>
                    )}
                    {/* Excel spreadsheet badge */}
                    {excelFilename && (
                      <div className={`flex flex-wrap gap-1.5 justify-end ${displayText ? 'mt-1.5' : ''}`}>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-medium border border-emerald-100">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {excelFilename}
                        </span>
                      </div>
                    )}
                    {/* Show attached document names on user messages */}
                    {msg.documents && msg.documents.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5 justify-end">
                        {msg.documents.map(doc => (
                          <span key={doc.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-medium border border-blue-100">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            {doc.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })() : (
                  <div className="max-w-full">
                    <div className="flex items-start gap-3.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="min-w-0 pt-0.5">
                        {cleanContent && (
                          <div
                            className="prose text-[14px] text-gray-700 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(cleanContent) }}
                          />
                        )}
                        {/* Blinking cursor during streaming */}
                        {isStreamingThisMsg && (
                          <span className="inline-block w-0.5 h-3.5 bg-gray-500 ml-0.5 align-middle animate-pulse" />
                        )}
                        {artifacts.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {artifacts.map(a => (
                              <span
                                key={a.id}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-black/[0.06] text-gray-600 rounded-xl text-xs font-medium shadow-sm"
                              >
                                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {getArtifactLabel(a.type)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* ThinkingIndicator: before first token OR while streaming an artifact (cleanContent is empty)
              Also show when raw JSON is streaming in without artifact tags. */}
          {isLoading && (() => {
            const lastMsg = messages[messages.length - 1];
            if (!lastMsg || lastMsg.role !== 'assistant') return true; // no token yet
            const stripped = lastMsg.content.replace(/<artifact\b[\s\S]*/, '');
            // Raw JSON block streaming without tags — will be auto-extracted after completion
            const braceIdx = stripped.indexOf('{');
            if (braceIdx !== -1 && (stripped.length - braceIdx) > 80) return true;
            const { cleanContent: streamingClean } = parseArtifacts(stripped);
            return !streamingClean.trim(); // streaming but visible text is empty (mid-artifact JSON)
          })() && <ThinkingIndicator />}
        </div>

        <div ref={messagesEndRef} className="h-24" />
      </div>

      {/* Floating glass input */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ background: `linear-gradient(to bottom, transparent 0%, ${BG} 45%)` }}>
        <div className="pb-6 pt-20 flex justify-center px-10">
          <div className="w-full max-w-2xl pointer-events-auto">
            <div className="bg-white/70 backdrop-blur-2xl border border-black/[0.08] rounded-[20px] px-5 py-4 shadow-lg shadow-black/[0.03]">
              {/* Pending attachments */}
              {(pendingDocs.length > 0 || pendingExcel) && (
                <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-black/[0.06]">
                  {pendingDocs.map(doc => (
                    <span key={doc.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-medium border border-blue-100">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      {doc.name}
                      <button onClick={() => removePendingDoc(doc.id)} className="ml-0.5 text-blue-400 hover:text-blue-600">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {pendingExcel && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-medium border border-emerald-100">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {pendingExcel.filename}
                      <button onClick={() => setPendingExcel(null)} className="ml-0.5 text-emerald-500 hover:text-emerald-700">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={pendingDocs.length > 0 || pendingExcel ? 'Add a message or press send...' : `Message about ${client.name}...`}
                  rows={1}
                  className="flex-1 resize-none py-1 bg-transparent text-[14px] text-gray-800 placeholder-gray-400 focus:outline-none leading-relaxed"
                />
                <button
                  onClick={handleSubmit}
                  disabled={(!input.trim() && pendingDocs.length === 0 && !pendingExcel) || isLoading}
                  className="w-10 h-10 flex items-center justify-center bg-gray-900 text-white rounded-[14px] hover:bg-gray-800 transition-all disabled:opacity-15 disabled:cursor-not-allowed shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-center text-[10px] text-gray-400/50 mt-3">AI can make mistakes. Always verify outputs before acting on recommendations.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
