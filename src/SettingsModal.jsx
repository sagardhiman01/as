import React from 'react';
import { X } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, setSettings }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 w-full max-w-lg rounded-xl shadow-2xl p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-500">
          Nexus Edu Settings
        </h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Provider</label>
            <select 
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={settings.provider}
              onChange={(e) => setSettings({...settings, provider: e.target.value})}
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="nvidia">NVIDIA NIM (DeepSeek/Meta/etc)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Model Name</label>
            <input 
              type="text"
              list="model-list"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={settings.modelName}
              placeholder={settings.provider === 'gemini' ? 'gemini-1.5-pro' : (settings.provider === 'nvidia' ? 'deepseek-ai/deepseek-v4-pro' : 'gpt-4o')}
              onChange={(e) => setSettings({...settings, modelName: e.target.value})}
            />
            <datalist id="model-list">
              <option value="deepseek-ai/deepseek-v4-pro" />
              <option value="qwen/qwen3.5-397b-a17b" />
              <option value="meta/llama3-70b-instruct" />
              <option value="mistralai/mixtral-8x22b-instruct-v0.1" />
              <option value="gpt-4o" />
              <option value="gpt-4-turbo" />
              <option value="gemini-1.5-pro" />
              <option value="gemini-1.5-flash" />
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
            <input 
              type="password"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={settings.apiKey}
              placeholder="Enter your API Key here"
              onChange={(e) => setSettings({...settings, apiKey: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              System Prompt (Teacher Persona)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              This prompt defines the core behavior of your AI teacher. The default turns it into a multi-disciplinary instructor.
            </p>
            <textarea 
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500 h-32 resize-none"
              value={settings.systemPrompt}
              placeholder="You are a Multi-Disciplinary Teacher..."
              onChange={(e) => setSettings({...settings, systemPrompt: e.target.value})}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 text-white font-semibold py-2 px-6 rounded-lg transition shadow-lg"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
