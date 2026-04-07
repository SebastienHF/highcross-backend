import { useState } from 'react';
import type { ClientData } from '../types';

interface Props {
  clients: ClientData[];
  selectedClient: ClientData | null;
  onSelectClient: (client: ClientData) => void;
  onAddClient: (name: string) => void;
  onDeleteClient: (clientId: string) => void;
  onRenameClient: (clientId: string, newName: string) => void;
  onClearChat: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export default function Sidebar({ clients, selectedClient, onSelectClient, onAddClient, onDeleteClient, onRenameClient, onClearChat, onOpenSettings, onLogout }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleSubmit = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAddClient(trimmed);
    setNewName('');
    setShowAddForm(false);
  };

  const submitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && renamingId) onRenameClient(renamingId, trimmed);
    setRenamingId(null);
    setRenameValue('');
  };

  return (
    <div className="w-[270px] bg-[#eeeee8] flex flex-col shrink-0 shadow-[1px_0_0_0_rgba(0,0,0,0.06),4px_0_12px_-2px_rgba(0,0,0,0.04)]">
      {/* Brand */}
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-[11px] font-bold text-white">HF</span>
          </div>
          <h1 className="text-[14px] font-semibold tracking-tight text-gray-800">Highcross Financial</h1>
        </div>
        <p className="text-[9px] text-gray-400 font-semibold tracking-[0.2em] uppercase mt-3 pl-0.5">Agentic Back-End</p>
      </div>

      {/* Client list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 light-scroll">
        <div className="flex items-center justify-between px-2 mb-3">
          <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-semibold">
            Clients
          </p>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-black/[0.06] transition-all duration-150"
            title="Add client"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {showAddForm && (
          <div className="mb-4 px-1 animate-fade-in">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Client name..."
              autoFocus
              className="w-full px-3.5 py-2.5 bg-white border border-black/[0.08] rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-sm"
            />
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={handleSubmit}
                disabled={!newName.trim()}
                className="flex-1 py-2 bg-gray-900 text-white text-xs font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-30"
              >
                Add
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewName(''); }}
                className="flex-1 py-2 bg-black/[0.04] text-gray-500 text-xs rounded-xl hover:bg-black/[0.08] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {clients.map(client => {
            const isSelected = selectedClient?.id === client.id;
            const isConfirming = confirmDeleteId === client.id;
            const isRenaming = renamingId === client.id;
            return (
              <div key={client.id} className="relative group/row">
                <button
                  onClick={() => { setConfirmDeleteId(null); onSelectClient(client); }}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-150 flex items-center gap-3.5 group ${
                    isSelected
                      ? 'bg-white shadow-sm text-gray-900 ring-1 ring-black/[0.04]'
                      : 'text-gray-500 hover:bg-white/70 hover:text-gray-800 hover:shadow-sm'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm'
                      : 'bg-black/[0.05] text-gray-400 group-hover:bg-black/[0.08] group-hover:text-gray-500'
                  }`}>
                    {client.initials}
                  </div>
                  <div className="min-w-0 pr-14">
                    <div className="text-[13px] font-medium truncate">{client.name}</div>
                    <div className="text-[11px] text-gray-400 truncate mt-1">
                      {[client.factFind['Date of Birth'], client.factFind['Tax Position']].filter(Boolean).join(' · ').slice(0, 35) || 'New client'}
                    </div>
                  </div>
                </button>

                {/* Hover action buttons — rename + delete */}
                {!isConfirming && !isRenaming && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover/row:opacity-100 transition-all duration-150">
                    <button
                      onClick={e => { e.stopPropagation(); setRenamingId(client.id); setRenameValue(client.name); setConfirmDeleteId(null); }}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-blue-400 hover:bg-blue-50 transition-all"
                      title="Rename client"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDeleteId(client.id); }}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
                      title="Delete client"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Inline rename */}
                {isRenaming && (
                  <div className="absolute inset-0 flex items-center gap-2 px-3 bg-white rounded-xl ring-1 ring-blue-300 z-10 shadow-sm">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); } }}
                      onBlur={submitRename}
                      className="flex-1 text-[13px] text-gray-800 bg-transparent outline-none min-w-0"
                    />
                    <button
                      onMouseDown={e => { e.preventDefault(); submitRename(); }}
                      className="text-[11px] font-medium text-blue-500 hover:text-blue-700 shrink-0"
                    >
                      Save
                    </button>
                  </div>
                )}

                {/* Confirm delete */}
                {isConfirming && (
                  <div className="absolute inset-0 flex items-center justify-between px-3 bg-red-50 rounded-xl ring-1 ring-red-200 z-10">
                    <span className="text-[11px] text-red-600 font-medium">Delete {client.name}?</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={e => { e.stopPropagation(); onDeleteClient(client.id); setConfirmDeleteId(null); }}
                        className="px-2.5 py-1 bg-red-500 text-white text-[11px] font-medium rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}
                        className="px-2.5 py-1 bg-white text-gray-500 text-[11px] rounded-lg hover:bg-gray-50 transition-colors ring-1 ring-black/[0.06]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="px-4 py-4 border-t border-black/[0.05] space-y-1">
        {selectedClient && (
          <button
            onClick={onClearChat}
            className="w-full text-left px-4 py-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-black/[0.04] transition-all duration-150 text-xs flex items-center gap-2.5"
            title="Clear conversation history — keeps all client data and fact find"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            New conversation
          </button>
        )}
        <button
          onClick={onOpenSettings}
          className="w-full text-left px-4 py-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-black/[0.04] transition-all duration-150 text-xs flex items-center gap-2.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
        <button
          onClick={onLogout}
          className="w-full text-left px-4 py-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150 text-xs flex items-center gap-2.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
        </div>
    </div>
  );
}
