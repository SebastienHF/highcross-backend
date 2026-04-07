import type { DocumentAttachment } from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export async function apiLogin(email: string, password: string): Promise<{ token: string; email: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Login failed');
  }
  return res.json();
}

export async function apiRegister(email: string, password: string): Promise<{ token: string; email: string }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Registration failed');
  }
  return res.json();
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function sendMessage(
  userMessage: string,
  clientId: string,
  documents?: DocumentAttachment[],
  onChunk?: (text: string) => void,
): Promise<string> {
  const response = await fetch(`${API_BASE}/api/clients/${clientId}/chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ content: userMessage, documents: documents ?? null }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { detail?: string }).detail || `API error: ${response.status}`);
  }

  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        try {
          const event = JSON.parse(data);
          if (typeof event.text === 'string') {
            accumulated += event.text;
            onChunk?.(event.text);
          } else if (event.error) {
            throw new Error(event.error);
          }
        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input') {
            const msg = parseErr.message;
            if (msg.includes('Stream error') || msg.includes('overloaded') || msg.includes('rate limit')) {
              throw parseErr;
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return accumulated;
}

// ─── Clients ──────────────────────────────────────────────────────────────────

function normaliseClient(c: Record<string, unknown>) {
  return {
    id: c.id,
    name: c.name,
    initials: c.initials,
    factFind: (c.fact_find ?? c.factFind ?? {}) as Record<string, string>,
    softKnowledge: (c.soft_knowledge ?? c.softKnowledge ?? '') as string,
    confirmedRecommendations: (c.confirmed_recommendations ?? c.confirmedRecommendations ?? []) as unknown[],
    openItems: (c.open_items ?? c.openItems ?? []) as string[],
    savedArtifacts: (c.saved_artifacts ?? c.savedArtifacts ?? []) as unknown[],
    savedMessages: (c.saved_messages ?? c.savedMessages ?? []) as unknown[],
  };
}

export async function fetchClients() {
  const res = await fetch(`${API_BASE}/api/clients/`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load clients: ${res.status}`);
  const data = await res.json();
  return data.map(normaliseClient);
}

export async function fetchClient(clientId: string) {
  const res = await fetch(`${API_BASE}/api/clients/${clientId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to load client: ${res.status}`);
  return normaliseClient(await res.json());
}

export async function apiCreateClient(data: { id: string; name: string; initials: string }) {
  const res = await fetch(`${API_BASE}/api/clients/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create client: ${res.status}`);
  return res.json();
}

export async function apiUpdateClient(clientId: string, data: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/clients/${clientId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update client: ${res.status}`);
  return res.json();
}

export async function apiDeleteClient(clientId: string) {
  const res = await fetch(`${API_BASE}/api/clients/${clientId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete client: ${res.status}`);
}

// ─── Artifacts ────────────────────────────────────────────────────────────────

export async function apiSaveArtifact(clientId: string, artifact: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/clients/${clientId}/artifacts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(artifact),
  });
  if (!res.ok) throw new Error(`Failed to save artifact: ${res.status}`);
}

export async function apiUpdateArtifact(artifactId: string, data: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/artifacts/${artifactId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update artifact: ${res.status}`);
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export async function apiAddRecommendation(clientId: string, rec: { type: string; summary: string; confirmedAt: string }) {
  const res = await fetch(`${API_BASE}/api/clients/${clientId}/recommendations`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(rec),
  });
  if (!res.ok) throw new Error(`Failed to save recommendation: ${res.status}`);
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function apiClearMessages(clientId: string) {
  const res = await fetch(`${API_BASE}/api/clients/${clientId}/messages`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to clear messages: ${res.status}`);
}

export async function apiDeleteMessage(messageId: string) {
  const res = await fetch(`${API_BASE}/api/messages/${messageId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete message: ${res.status}`);
}

export { API_BASE };
