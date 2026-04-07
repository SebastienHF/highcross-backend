import { useState } from 'react';

interface Props {
  onSave: (key: string) => void;
  existingKey: string;
}

export default function ApiKeyModal({ onSave, existingKey }: Props) {
  const [key, setKey] = useState(existingKey);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-md mx-4 animate-fade-in border border-black/[0.06]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800">API Key Required</h2>
            <p className="text-xs text-gray-400">Stored locally in your browser only</p>
          </div>
        </div>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="sk-ant-..."
          className="w-full px-4 py-3 bg-[#f5f5f0] border border-black/[0.08] rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
        />
        <button
          onClick={() => key.trim() && onSave(key.trim())}
          disabled={!key.trim()}
          className="mt-4 w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
