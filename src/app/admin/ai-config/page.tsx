'use client';

import { useState, useEffect } from 'react';
import { AdminGuard } from '@/components/AdminGuard';

interface AIConfiguration {
  id: number;
  name: string;
  description?: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  user_prompt_template: string;
  examples: Record<string, any>;
  retry_config: {
    maxRetries: number;
    baseDelay: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AVAILABLE_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4',
  'gpt-4-turbo',
  'gpt-3.5-turbo'
];

export default function AIConfigurationPage() {
  const [configs, setConfigs] = useState<AIConfiguration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<AIConfiguration | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ai-config');
      if (!response.ok) {
        throw new Error('Failed to fetch configurations');
      }
      const data = await response.json();
      setConfigs(data.configs);
    } catch (error) {
      console.error('Error fetching configurations:', error);
      setError('Failed to load AI configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async (config: Partial<AIConfiguration>) => {
    try {
      const method = config.id ? 'PUT' : 'POST';
      const response = await fetch('/api/ai-config', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      const data = await response.json();
      setSuccessMessage(`Configuration ${config.id ? 'updated' : 'created'} successfully!`);
      setSelectedConfig(null);
      setIsEditing(false);
      fetchConfigurations();
    } catch (error) {
      console.error('Error saving configuration:', error);
      setError('Failed to save configuration');
    }
  };

  const handleEdit = (config: AIConfiguration) => {
    setSelectedConfig({...config});
    setIsEditing(true);
  };

  const handleNew = () => {
    setSelectedConfig({
      id: 0,
      name: '',
      description: '',
      model_name: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 1500,
      system_prompt: '',
      user_prompt_template: '',
      examples: {},
      retry_config: { maxRetries: 3, baseDelay: 1000 },
      is_active: true,
      created_at: '',
      updated_at: ''
    });
    setIsEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedConfig) {
      saveConfiguration(selectedConfig);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="p-6">
          <div className="text-center">Indlæser AI konfigurationer...</div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Konfigurationer</h1>
          <p className="text-gray-600">
            Administrer prompts og modeller for AI-drevet øvelsesgenerering
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button onClick={clearMessages} className="ml-2 text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {successMessage}
            <button onClick={clearMessages} className="ml-2 text-green-500 hover:text-green-700">
              ×
            </button>
          </div>
        )}

        <div className="flex gap-6">
          {/* Configuration List */}
          <div className="w-1/3">
            <div className="mb-4">
              <button
                onClick={handleNew}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Ny Konfiguration
              </button>
            </div>

            <div className="space-y-2">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className={`p-4 border rounded cursor-pointer transition-colors ${
                    selectedConfig?.id === config.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => setSelectedConfig(config)}
                >
                  <div className="font-semibold">{config.name}</div>
                  <div className="text-sm text-gray-600">
                    Model: {config.model_name}
                  </div>
                  <div className="text-sm text-gray-600">
                    Status: {config.is_active ? 'Aktiv' : 'Inaktiv'}
                  </div>
                  {config.description && (
                    <div className="text-sm text-gray-500 mt-1">
                      {config.description}
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(config);
                    }}
                    className="mt-2 px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                  >
                    Rediger
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Configuration Details/Editor */}
          <div className="w-2/3">
            {isEditing && selectedConfig ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-xl font-semibold">
                  {selectedConfig.id ? 'Rediger Konfiguration' : 'Ny Konfiguration'}
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Navn
                  </label>
                  <input
                    type="text"
                    value={selectedConfig.name}
                    onChange={(e) => setSelectedConfig({
                      ...selectedConfig,
                      name: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beskrivelse
                  </label>
                  <input
                    type="text"
                    value={selectedConfig.description || ''}
                    onChange={(e) => setSelectedConfig({
                      ...selectedConfig,
                      description: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    <select
                      value={selectedConfig.model_name}
                      onChange={(e) => setSelectedConfig({
                        ...selectedConfig,
                        model_name: e.target.value
                      })}
                      className="w-full p-2 border border-gray-300 rounded"
                    >
                      {AVAILABLE_MODELS.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temperatur
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={selectedConfig.temperature}
                      onChange={(e) => setSelectedConfig({
                        ...selectedConfig,
                        temperature: parseFloat(e.target.value)
                      })}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="8000"
                      value={selectedConfig.max_tokens}
                      onChange={(e) => setSelectedConfig({
                        ...selectedConfig,
                        max_tokens: parseInt(e.target.value)
                      })}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    System Prompt
                  </label>
                  <textarea
                    value={selectedConfig.system_prompt}
                    onChange={(e) => setSelectedConfig({
                      ...selectedConfig,
                      system_prompt: e.target.value
                    })}
                    rows={6}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="System prompt med {{variable}} placeholders..."
                    required
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    Brug {'{{'} og {'}}'}  til variabler, f.eks. {'{{level}}'}, {'{{topic}}'}, {'{{questionCount}}'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Prompt Template
                  </label>
                  <textarea
                    value={selectedConfig.user_prompt_template}
                    onChange={(e) => setSelectedConfig({
                      ...selectedConfig,
                      user_prompt_template: e.target.value
                    })}
                    rows={8}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="User prompt template med {{variable}} placeholders..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Eksempler (JSON)
                  </label>
                  <textarea
                    value={JSON.stringify(selectedConfig.examples, null, 2)}
                    onChange={(e) => {
                      try {
                        const examples = JSON.parse(e.target.value);
                        setSelectedConfig({
                          ...selectedConfig,
                          examples
                        });
                      } catch (error) {
                        // Invalid JSON, keep the text but don't update state
                      }
                    }}
                    rows={8}
                    className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
                    placeholder='{"grammar": {"example": "data"}, "vocabulary": {...}}'
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Retries
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={selectedConfig.retry_config.maxRetries}
                      onChange={(e) => setSelectedConfig({
                        ...selectedConfig,
                        retry_config: {
                          ...selectedConfig.retry_config,
                          maxRetries: parseInt(e.target.value)
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Base Delay (ms)
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="10000"
                      value={selectedConfig.retry_config.baseDelay}
                      onChange={(e) => setSelectedConfig({
                        ...selectedConfig,
                        retry_config: {
                          ...selectedConfig.retry_config,
                          baseDelay: parseInt(e.target.value)
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Aktiv
                    </label>
                    <input
                      type="checkbox"
                      checked={selectedConfig.is_active}
                      onChange={(e) => setSelectedConfig({
                        ...selectedConfig,
                        is_active: e.target.checked
                      })}
                      className="mt-3"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Gem
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedConfig(null);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Annuller
                  </button>
                </div>
              </form>
            ) : selectedConfig ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">{selectedConfig.name}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Model:</strong> {selectedConfig.model_name}
                  </div>
                  <div>
                    <strong>Temperatur:</strong> {selectedConfig.temperature}
                  </div>
                  <div>
                    <strong>Max Tokens:</strong> {selectedConfig.max_tokens}
                  </div>
                  <div>
                    <strong>Status:</strong> {selectedConfig.is_active ? 'Aktiv' : 'Inaktiv'}
                  </div>
                </div>
                
                <div>
                  <strong>Beskrivelse:</strong>
                  <p className="text-gray-600">{selectedConfig.description || 'Ingen beskrivelse'}</p>
                </div>

                <div>
                  <strong>System Prompt:</strong>
                  <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                    {selectedConfig.system_prompt}
                  </pre>
                </div>

                <div>
                  <strong>User Prompt Template:</strong>
                  <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                    {selectedConfig.user_prompt_template}
                  </pre>
                </div>

                <button
                  onClick={() => handleEdit(selectedConfig)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Rediger
                </button>
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-8">
                Vælg en konfiguration for at se detaljer eller opret en ny
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}