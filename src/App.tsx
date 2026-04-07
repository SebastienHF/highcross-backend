import { useState, useCallback, useRef, useEffect } from 'react';
import type { ClientData, ChatMessage, Artifact, DocumentAttachment } from './types';
import {
  sendMessage,
  fetchClients,
  apiCreateClient,
  apiUpdateClient,
  apiDeleteClient,
  apiSaveArtifact,
  apiUpdateArtifact,
  apiAddRecommendation,
  apiClearMessages,
  apiDeleteMessage,
  API_BASE,
} from './api';
import { parseArtifacts } from './parseArtifacts';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import ArtifactPanel from './components/ArtifactPanel';
import ArtifactEditor from './components/ArtifactEditor';
import LoginScreen from './components/LoginScreen';

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export default function App() {
  const storedToken = localStorage.getItem('auth_token');
  const tokenValid = storedToken ? (getTokenExpiry(storedToken) ?? 0) > Date.now() : false;

  const [token, setToken] = useState<string | null>(tokenValid ? storedToken : null);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionDocuments, setSessionDocuments] = useState<DocumentAttachment[]>([]);
  const [editorArtifact, setEditorArtifact] = useState<Artifact | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  const handleLoginSuccess = (newToken: string, _email: string) => {
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setClients([]);
    setSelectedClient(null);
    setMessages([]);
    setArtifacts([]);
  }, []);

  // Auto-logout when token expires
  useEffect(() => {
    if (!token) return;
    const expiry = getTokenExpiry(token);
    if (!expiry) return;
    const msUntilExpiry = expiry - Date.now();
    if (msUntilExpiry <= 0) { handleLogout(); return; }
    const timer = setTimeout(handleLogout, msUntilExpiry);
    return () => clearTimeout(timer);
  }, [token, handleLogout]);

  // Refs for callbacks that need current values without stale closures
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const selectedClientRef = useRef(selectedClient);
  selectedClientRef.current = selectedClient;
  const clientsRef = useRef(clients);
  clientsRef.current = clients;
  const artifactsRef = useRef(artifacts);
  artifactsRef.current = artifacts;

  // ── Load clients from backend on mount (only when authenticated) ────────────
  useEffect(() => {
    if (!token) return;
    fetchClients()
      .then((data: ClientData[]) => {
        const loaded = data.map((c: ClientData) => ({
          ...c,
          savedArtifacts: c.savedArtifacts || [],
          savedMessages: c.savedMessages || [],
        }));
        setClients(loaded);
        setBackendError(null);
      })
      .catch(() => {
        setBackendError('Cannot connect to backend. Make sure the FastAPI server is running on port 8000.');
      });
  }, [token]);

  // ── Session transcript helpers ───────────────────────────────────────────────
  function buildSchemeAssessmentSummary(arts: Artifact[]): string {
    const schemeArts = arts.filter(a => a.type === 'scheme_assessment' && a.structuredData);
    if (schemeArts.length === 0) return '';
    const lines: string[] = ['\n\nSchemes assessed this session:'];
    for (const art of schemeArts) {
      const data = art.structuredData as { schemes?: Array<{ provider?: string; currentValue?: number; schemeType?: string; limitingFactors?: Array<{ severity: string }> }> };
      if (!data.schemes) continue;
      for (const scheme of data.schemes) {
        const flags = scheme.limitingFactors || [];
        const redCount = flags.filter(f => f.severity === 'red').length;
        const amberCount = flags.filter(f => f.severity === 'amber').length;
        const flagSummary = redCount + amberCount > 0
          ? ` (${redCount} red, ${amberCount} amber flags)`
          : ' (no limiting factors)';
        lines.push(`- ${scheme.provider || 'Unknown'}: ${scheme.schemeType || 'Unknown type'}, £${(scheme.currentValue || 0).toLocaleString()}${flagSummary}`);
      }
    }
    return lines.join('\n');
  }

  function formatTranscript(msgs: ChatMessage[]): string {
    return msgs
      .map(m => {
        const content = m.role === 'assistant'
          ? m.content.replace(/<artifact\b[^>]*>[\s\S]*?<\/artifact>/gi, '[artifact generated]')
          : m.content;
        return `${m.role === 'user' ? 'Adviser' : 'Assistant'}: ${content}`;
      })
      .join('\n\n');
  }

  const appendTranscriptToClient = useCallback(async (clientId: string, transcript: ChatMessage[]) => {
    if (transcript.length === 0) return;
    const client = clientsRef.current.find(c => c.id === clientId);
    if (!client) return;

    const dateHeader = new Date().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const schemeSummary = buildSchemeAssessmentSummary(artifactsRef.current);
    const sessionBlock = `\n\n--- Session ${dateHeader} ---\n${formatTranscript(transcript)}${schemeSummary}\n---`;
    const updatedSoftKnowledge = client.softKnowledge + sessionBlock;

    setClients(prev =>
      prev.map(c => c.id === clientId ? { ...c, softKnowledge: updatedSoftKnowledge } : c)
    );

    await apiUpdateClient(clientId, { soft_knowledge: updatedSoftKnowledge }).catch(() => {});
  }, []);

  // ── Client selection ─────────────────────────────────────────────────────────
  const handleSelectClient = useCallback((client: ClientData) => {
    if (selectedClientRef.current && messagesRef.current.length > 0) {
      appendTranscriptToClient(selectedClientRef.current.id, messagesRef.current);
    }

    setClients(prev => {
      const latest = prev.find(c => c.id === client.id);
      const resolved = latest || client;
      setSelectedClient(resolved);
      setArtifacts(resolved.savedArtifacts || []);
      setMessages(resolved.savedMessages || []);
      setSessionDocuments([]);
      return prev;
    });
  }, [appendTranscriptToClient]);

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async (content: string, documents?: DocumentAttachment[]) => {
    if (!selectedClient) return;

    const clientId = selectedClient.id;
    const isStillThisClient = () => selectedClientRef.current?.id === clientId;

    const userMessage: ChatMessage = {
      role: 'user',
      content,
      documents,
      timestamp: new Date().toISOString(),
    };

    const streamTimestamp = new Date().toISOString();
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    let firstChunk = true;

    try {
      const response = await sendMessage(
        content,
        clientId,
        documents,
        (chunk: string) => {
          if (!isStillThisClient()) return;
          if (firstChunk) {
            firstChunk = false;
            setMessages(prev => [...prev, {
              role: 'assistant' as const,
              content: chunk,
              timestamp: streamTimestamp,
            }]);
          } else {
            setMessages(prev => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = { ...last, content: last.content + chunk };
              }
              return copy;
            });
          }
        }
      );

      if (!isStillThisClient()) return;

      const { artifacts: newArtifacts, cleanContent } = parseArtifacts(response);
      const storedContent = cleanContent;

      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === 'assistant') {
          copy[copy.length - 1] = {
            ...last,
            content: storedContent,
            artifacts: newArtifacts.length > 0 ? newArtifacts : undefined,
          };
        }
        return copy;
      });

      const factFindUpdates = newArtifacts.filter(a => a.type === 'fact_find_update');
      const displayArtifacts = newArtifacts.filter(a => a.type !== 'fact_find_update');

      // Auto-apply fact find updates
      if (factFindUpdates.length > 0) {
        for (const update of factFindUpdates) {
          const data = update.structuredData as Record<string, string> | undefined;
          if (data && typeof data === 'object') {
            const applyUpdate = (c: ClientData): ClientData => ({
              ...c,
              factFind: { ...c.factFind, ...data },
            });
            setClients(prev => prev.map(c => c.id === clientId ? applyUpdate(c) : c));
            if (isStillThisClient()) {
              setSelectedClient(prev => prev ? applyUpdate(prev) : prev);
            }
            // Persist fact find update to backend
            const currentClient = clientsRef.current.find(c => c.id === clientId);
            if (currentClient) {
              const updatedFactFind = { ...currentClient.factFind, ...data };
              apiUpdateClient(clientId, { fact_find: updatedFactFind }).catch(() => {});
            }
          }
        }
      }

      // Save and display new artifacts
      if (displayArtifacts.length > 0) {
        setArtifacts(prev => {
          let updated = [...prev];
          for (const newArt of displayArtifacts) {
            const existingIdx = updated.findLastIndex(
              a => a.type === newArt.type && !a.confirmed
            );
            if (existingIdx >= 0) {
              const superseded = updated[existingIdx];
              updated[existingIdx] = {
                ...newArt,
                version: (superseded.version || 1) + 1,
                supersedes: superseded.id,
              };
            } else {
              updated.push(newArt);
            }
          }
          // Persist to backend
          for (const art of displayArtifacts) {
            apiSaveArtifact(clientId, art as unknown as Record<string, unknown>).catch(() => {});
          }
          return updated;
        });
      }
    } catch (err) {
      if (!isStillThisClient()) return;
      const errText = `**Error:** ${err instanceof Error ? err.message : 'Failed to get response'}`;
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === 'assistant') {
          copy[copy.length - 1] = { ...last, content: errText };
          return copy;
        }
        return [...copy, { role: 'assistant' as const, content: errText, timestamp: new Date().toISOString() }];
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedClient]);

  // ── Confirm / unconfirm artifact ─────────────────────────────────────────────
  const handleConfirmArtifact = useCallback(async (artifactId: string) => {
    const now = new Date().toISOString();

    setArtifacts(prev =>
      prev.map(a => a.id === artifactId ? { ...a, confirmed: true, confirmedAt: now } : a)
    );
    setMessages(prev =>
      prev.map(msg => ({
        ...msg,
        artifacts: msg.artifacts?.map(a =>
          a.id === artifactId ? { ...a, confirmed: true, confirmedAt: now } : a
        ),
      }))
    );

    await apiUpdateArtifact(artifactId, { confirmed: true, confirmedAt: now }).catch(() => {});

    const confirmed = artifactsRef.current.find(a => a.id === artifactId);
    if (confirmed && selectedClient) {
      const rec = {
        type: confirmed.type,
        summary: confirmed.content,
        confirmedAt: now,
      };
      const updateClient = (c: ClientData): ClientData => ({
        ...c,
        confirmedRecommendations: [...c.confirmedRecommendations, rec],
      });
      setClients(prev => prev.map(c => c.id === selectedClient.id ? updateClient(c) : c));
      setSelectedClient(prev => prev ? updateClient(prev) : prev);
      await apiAddRecommendation(selectedClient.id, rec).catch(() => {});
    }
  }, [selectedClient]);

  const handleUnconfirmArtifact = useCallback((artifactId: string) => {
    setArtifacts(prev =>
      prev.map(a => a.id === artifactId ? { ...a, confirmed: false, confirmedAt: undefined } : a)
    );
    setMessages(prev =>
      prev.map(msg => ({
        ...msg,
        artifacts: msg.artifacts?.map(a =>
          a.id === artifactId ? { ...a, confirmed: false, confirmedAt: undefined } : a
        ),
      }))
    );
    apiUpdateArtifact(artifactId, { confirmed: false, confirmedAt: null }).catch(() => {});
  }, []);

  // ── Client management ────────────────────────────────────────────────────────
  const handleAddDocuments = useCallback((docs: DocumentAttachment[]) => {
    setSessionDocuments(prev => [...prev, ...docs]);
  }, []);

  const handleDeleteMessage = useCallback((index: number) => {
    const msg = messagesRef.current[index];
    if (msg && (msg as ChatMessage & { id?: string }).id) {
      apiDeleteMessage((msg as ChatMessage & { id?: string }).id!).catch(() => {});
    }
    setMessages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleClearChat = useCallback(async () => {
    if (!selectedClient) return;
    setMessages([]);
    setArtifacts([]);
    setSessionDocuments([]);
    await apiClearMessages(selectedClient.id).catch(() => {});
  }, [selectedClient]);

  const handleRenameClient = useCallback(async (clientId: string, newName: string) => {
    const newInitials = newName.split(' ').map(w => w[0]?.toUpperCase() || '').join('').slice(0, 2);
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const updatedArtifacts = c.savedArtifacts.map(a => {
        if (!a.structuredData || typeof a.structuredData !== 'object') return a;
        const d = a.structuredData as Record<string, unknown>;
        if ('clientName' in d) return { ...a, structuredData: { ...d, clientName: newName } };
        return a;
      });
      return { ...c, name: newName, initials: newInitials, savedArtifacts: updatedArtifacts };
    }));
    setSelectedClient(prev => {
      if (!prev || prev.id !== clientId) return prev;
      return { ...prev, name: newName, initials: newInitials };
    });
    setArtifacts(prev => prev.map(a => {
      if (!a.structuredData || typeof a.structuredData !== 'object') return a;
      const d = a.structuredData as Record<string, unknown>;
      if ('clientName' in d) return { ...a, structuredData: { ...d, clientName: newName } };
      return a;
    }));
    await apiUpdateClient(clientId, { name: newName, initials: newInitials }).catch(() => {});
  }, []);

  const handleDeleteClient = useCallback(async (clientId: string) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
    if (selectedClientRef.current?.id === clientId) {
      setSelectedClient(null);
      setMessages([]);
      setArtifacts([]);
      setSessionDocuments([]);
    }
    await apiDeleteClient(clientId).catch(() => {});
  }, []);

  const handleAddClient = useCallback(async (name: string) => {
    const initials = name.split(' ').map(w => w[0]?.toUpperCase() || '').join('').slice(0, 2);
    const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const newClient: ClientData = {
      id,
      name,
      initials,
      factFind: {},
      softKnowledge: '',
      confirmedRecommendations: [],
      openItems: [],
      savedArtifacts: [],
      savedMessages: [],
    };
    setClients(prev => [...prev, newClient]);
    setSelectedClient(newClient);
    setMessages([]);
    setArtifacts([]);
    setSessionDocuments([]);
    await apiCreateClient({ id, name, initials }).catch(() => {});
  }, []);

  // ── Editor ───────────────────────────────────────────────────────────────────
  const handleOpenEditor = useCallback((artifact: Artifact) => {
    setEditorArtifact(artifact);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setEditorArtifact(null);
  }, []);

  const handleSaveToFile = useCallback((artifactId: string) => {
    const now = new Date().toISOString();
    setArtifacts(prev => prev.map(a =>
      a.id === artifactId ? { ...a, savedToFile: true, savedToFileAt: now } : a
    ));
    apiUpdateArtifact(artifactId, { savedToFile: true }).catch(() => {});
  }, []);

  // ── Append transcript on page unload ─────────────────────────────────────────
  useEffect(() => {
    const handleUnload = () => {
      if (selectedClientRef.current && messagesRef.current.length > 0) {
        const client = selectedClientRef.current;
        const dateHeader = new Date().toLocaleDateString('en-GB', {
          day: 'numeric', month: 'long', year: 'numeric',
        });
        const schemeSummary = buildSchemeAssessmentSummary(artifactsRef.current);
        const sessionBlock = `\n\n--- Session ${dateHeader} ---\n${formatTranscript(messagesRef.current)}${schemeSummary}\n---`;
        const updatedSoft = client.softKnowledge + sessionBlock;

        // sendBeacon is fire-and-forget, designed for page-unload saves
        navigator.sendBeacon(
          `${API_BASE}/api/clients/${client.id}`,
          new Blob(
            [JSON.stringify({ soft_knowledge: updatedSoft })],
            { type: 'application/json' }
          )
        );
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  if (!token) {
    return <LoginScreen onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-[#f5f5f0]">
      {backendError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-8 max-w-md shadow-xl text-center">
            <p className="text-sm font-medium text-gray-800 mb-2">Backend not reachable</p>
            <p className="text-xs text-gray-500 mb-5">{backendError}</p>
            <button
              onClick={() => {
                setBackendError(null);
                fetchClients().then(data => setClients(data)).catch(() => setBackendError('Still unreachable.'));
              }}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <Sidebar
        clients={clients}
        selectedClient={selectedClient}
        onSelectClient={handleSelectClient}
        onAddClient={handleAddClient}
        onRenameClient={handleRenameClient}
        onDeleteClient={handleDeleteClient}
        onClearChat={handleClearChat}
        onOpenSettings={() => {}}
        onLogout={handleLogout}
      />

      <ChatPanel
        client={selectedClient}
        messages={messages}
        isLoading={isLoading}
        sessionDocuments={sessionDocuments}
        onSendMessage={handleSendMessage}
        onAddDocuments={handleAddDocuments}
        onDeleteMessage={handleDeleteMessage}
      />

      <ArtifactPanel
        artifacts={artifacts}
        clientName={selectedClient?.name || ''}
        onOpen={handleOpenEditor}
      />

      {editorArtifact && (
        <ArtifactEditor
          artifact={editorArtifact}
          clientName={selectedClient?.name || ''}
          onClose={handleCloseEditor}
          onSaveToFile={handleSaveToFile}
          onConfirm={handleConfirmArtifact}
          onUnconfirm={handleUnconfirmArtifact}
        />
      )}
    </div>
  );
}
