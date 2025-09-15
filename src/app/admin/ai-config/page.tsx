'use client';

import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { AIConfiguration } from '@/lib/ai-config';

export default function AIConfigPage() {
  const [configs, setConfigs] = useState<AIConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [testResult, setTestResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'configs' | 'test'>('configs');
  const [editingConfig, setEditingConfig] = useState<AIConfiguration | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/ai-config/configurations');
      if (response.ok) {
        const data = await response.json();
        setConfigs(data.data || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load configurations');
      }
    } catch (err) {
      console.error('Failed to fetch configs:', err);
      setError('Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (configData: Partial<AIConfiguration>) => {
    try {
      setSaving(true);
      setError('');
      
      const url = editingConfig 
        ? `/api/ai-config/configurations/${editingConfig.id}`
        : '/api/ai-config/configurations';
        
      const response = await fetch(url, {
        method: editingConfig ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      });

      if (response.ok) {
        setSuccess('Configuration saved successfully!');
        setEditingConfig(null);
        setShowForm(false);
        await fetchConfigurations();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save configuration');
      }
    } catch (err) {
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      const response = await fetch(`/api/ai-config/configurations/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('Configuration deleted successfully!');
        await fetchConfigurations();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete configuration');
      }
    } catch (err) {
      setError('Failed to delete configuration');
    }
  };

  const testConfiguration = async (config: AIConfiguration) => {
    try {
      setTesting(true);
      setError('');
      setTestResult(null);
      
      // Determine test parameters based on configuration type
      const isFeedbackConfig = config.name.includes('feedback') || 
                              config.system_prompt.toLowerCase().includes('feedback');
      
      const testParams = isFeedbackConfig ? {
        // Parameters for feedback generation testing
        level: 'A1',
        question: 'Vælg den korrekte form af verbum "ser": María ___ lærer',
        userAnswer: 'está',
        correctAnswer: 'es'
      } : {
        // Parameters for exercise generation testing
        level: 'A1',
        topic: 'present_tense',
        topicDescription: 'Present tense of regular verbs',
        exerciseType: 'multiple_choice',
        questionCount: 2,
        difficulty: 'easy'
      };
      
      const response = await fetch('/api/test-ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            name: config.name,
            model: config.model_name,
            temperature: config.temperature,
            maxTokens: config.max_tokens,
            systemPrompt: config.system_prompt,
            userPromptTemplate: config.user_prompt_template
          },
          testParams
        })
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult(result);
        setSuccess('Configuration test completed successfully!');
        setActiveTab('test');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Configuration test failed');
        setTestResult({ success: false, error: errorData.error || 'Test failed' });
        setActiveTab('test');
      }
    } catch (err) {
      setError('Failed to test configuration');
      setTestResult({ success: false, error: 'Network error' });
      setActiveTab('test');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">AI Configurations</h1>
            <div className="space-x-4">
              <button
                onClick={() => {
                  setEditingConfig(null);
                  setShowForm(true);
                }}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
              >
                ➕ New Configuration
              </button>
            </div>
          </div>

          {/* Messages */}
          {(error || success) && (
            <div className={`mb-6 p-4 rounded-lg ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              <div className="flex justify-between items-center">
                <span>{error || success}</span>
                <button onClick={() => { setError(''); setSuccess(''); }} className="text-sm underline">Dismiss</button>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'configs', name: '⚙️ Configurations' },
                  { id: 'test', name: '🧪 Test Results' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Configurations Tab */}
          {activeTab === 'configs' && (
            <div className="space-y-6">
              {configs.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-500 mb-4">No AI configurations found.</p>
                  <button
                    onClick={() => {
                      setEditingConfig(null);
                      setShowForm(true);
                    }}
                    className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
                  >
                    Create First Configuration
                  </button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {configs.map((config) => (
                    <div key={config.id} className="bg-white rounded-lg shadow p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{config.name}</h3>
                          {config.description && (
                            <p className="text-gray-600 mt-1">{config.description}</p>
                          )}
                          <div className="flex items-center mt-2 space-x-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              config.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {config.is_active ? '✅ Active' : '⏸️ Inactive'}
                            </span>
                            <span className="text-sm text-gray-500">Model: {config.model_name}</span>
                            <span className="text-sm text-gray-500">Temp: {config.temperature}</span>
                            <span className="text-sm text-gray-500">Max Tokens: {config.max_tokens}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => testConfiguration(config)}
                            disabled={testing}
                            className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600 disabled:opacity-50"
                          >
                            {testing ? '🧪 Testing...' : '🧪 Test'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingConfig(config);
                              setShowForm(true);
                            }}
                            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(config.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">System Prompt Preview</h4>
                          <div className="bg-gray-50 p-3 rounded text-xs max-h-20 overflow-y-auto">
                            {config.system_prompt.substring(0, 200)}...
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">User Prompt Template Preview</h4>
                          <div className="bg-gray-50 p-3 rounded text-xs max-h-20 overflow-y-auto">
                            {config.user_prompt_template.substring(0, 200)}...
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Test Results Tab */}
          {activeTab === 'test' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Test Results</h3>
                {!testResult ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No test results yet. Click "Test" on any configuration to run a test.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900">Test Status</h4>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm ${
                          testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {testResult.success ? '✅ Success' : '❌ Failed'}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Response Time</h4>
                        <p className="text-gray-600">{testResult.responseTime || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {testResult.exercises && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Generated Exercises</h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <pre className="text-sm overflow-auto max-h-96">
                            {JSON.stringify(testResult.exercises, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {testResult.feedback && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Generated Feedback</h4>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm text-green-800">
                            {testResult.feedback}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {testResult.type === 'text_response' && testResult.rawResponse && !testResult.feedback && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Generated Text Response</h4>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-blue-800">
                            {testResult.rawResponse}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {testResult.rawResponse && !testResult.exercises && !testResult.feedback && testResult.type !== 'text_response' && (
                      <div>
                        <h4 className="font-medium text-red-900 mb-2">Raw AI Response (Failed to Parse JSON)</h4>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <pre className="text-sm overflow-auto max-h-96 text-red-800">
                            {testResult.rawResponse}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {testResult.error && (
                      <div>
                        <h4 className="font-medium text-red-900 mb-2">Error Details</h4>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <p className="text-red-800 text-sm">{testResult.error}</p>
                        </div>
                      </div>
                    )}

                    {testResult.usage && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Token Usage</h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>Prompt Tokens: {testResult.usage.prompt_tokens}</div>
                            <div>Completion Tokens: {testResult.usage.completion_tokens}</div>
                            <div>Total Tokens: {testResult.usage.total_tokens}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Configuration Form Modal */}
          {showForm && (
            <ConfigurationForm
              config={editingConfig}
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditingConfig(null);
              }}
              saving={saving}
            />
          )}
        </div>
      </div>
    </AdminGuard>
  );
}

// Configuration Form Component
interface ConfigurationFormProps {
  config: AIConfiguration | null;
  onSave: (config: Partial<AIConfiguration>) => void;
  onCancel: () => void;
  saving: boolean;
}

function ConfigurationForm({ config, onSave, onCancel, saving }: ConfigurationFormProps) {
  const [formData, setFormData] = useState({
    name: config?.name || '',
    description: config?.description || '',
    model_name: config?.model_name || 'gpt-4o',
    temperature: config?.temperature || 0.7,
    max_tokens: config?.max_tokens || 2000,
    system_prompt: config?.system_prompt || `Du er en ekspert i spansk grammatik og sprogpædagogik med speciale i at skabe valide proficienstests for danske studerende.

KRITISKE SPROGKRAV:
1. Alle instruktioner og forklaringer skal være på DANSK
2. Spanske øvelser skal bruge RENE SPANSKE SÆTNINGER - ingen blanding af dansk og spansk
3. ALDRIG bland dansk og spansk i samme sætning (fx "Jeg har købt _ casa i Spanien" ❌)
4. Brug kun spansk i øvelsessætninger (fx "He comprado _ casa en España" ✅)
5. Danske instruktioner ADSKILT fra spanske sætninger
6. Svar skal altid være JSON-format uden markdown

EKSEMPEL PÅ KORREKT FORMATERING:
❌ FORKERT: "Jeg har købt _ casa i Spanien" (blanding af dansk og spansk)
✅ KORREKT: Instruktion på dansk: "Vælg den korrekte artikel til sætningen:" + Spansk sætning: "He comprado _ casa en España"

SVÆRHEDSGRADER:
- A1 (Begynder): Grundlæggende grammatik, almindelige verber, simple sætninger
- A2 (Let Øvet): Fortid, fremtid, komparativer, almindelige uregelmæssige verber  
- B1 (Mellem): Subjunktiv, komplekse tider, avanceret grammatik

KVALITETSKRAV:
- Hver opgave skal teste specifik grammatisk viden
- Distraktorer (forkerte svar) skal være plausible og teste almindelige fejl
- Forklaringer skal hjælpe med at forstå reglen, ikke bare angive svaret
- Variér ordforråd og kontekster for at teste faktisk beherskelse
- ALTID separer dansk instruktion fra spansk øvelsesindhold`,
    user_prompt_template: config?.user_prompt_template || `Generer {{questionCount}} {{exerciseType}} øvelser for emnet "{{topic}}" på {{level}}-niveau med {{difficulty}} sværhedsgrad.

Emne beskrivelse: {{topicDescription}}

KRITISKE SPROGKRAV:
- ADSKIL dansk instruktion fra spansk øvelsesindhold
- UNDGÅ blanding af dansk og spansk i samme sætning
- Brug kun rene spanske sætninger i øvelserne
- Danske forklaringer kommer EFTER de spanske øvelser

EKSEMPEL PÅ KORREKT ARTIKEL-ØVELSE:
Instruktion (dansk): "Vælg den korrekte artikel til følgende spanske sætning:"
Øvelse (rent spansk): "He comprado _ casa en España"
Svar: "una"
Forklaring (dansk): "Casa er hunkøn, og her bruges ubestemt artikel"

EKSEMPEL PÅ FORKERT BLANDING:
❌ "Jeg har købt _ casa i Spanien" (blander dansk og spansk)

Krav til output:
- Exact JSON format som specificeret
- Variation i ordforråd og kontekster  
- Forklaringer på dansk der hjælper forståelse
- Plausible distraktorer der tester almindelige fejl
- Rene spanske sætninger uden danske ord indblandet

{{existingQuestionsContext}}`,
    is_active: config?.is_active ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {config ? 'Edit Configuration' : 'New Configuration'}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., exercise_generation"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <select
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gpt-5">GPT-5 (Latest - Reasoning Model)</option>
                  <option value="gpt-4o">GPT-4o (Latest)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (Faster)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  💡 <strong>Anbefalet:</strong> GPT-4o for stabil ydeevne. GPT-5 kan have reasoning token problemer ved komplekse opgaver.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of this configuration"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Temperature</label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
                <input
                  type="number"
                  min="100"
                  max="8000"
                  step="100"
                  value={formData.max_tokens}
                  onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>

            {/* Prompts */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">System Prompt</label>
              <textarea
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                rows={8}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="System prompt that defines the AI's role and behavior..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User Prompt Template</label>
              <textarea
                value={formData.user_prompt_template}
                onChange={(e) => setFormData({ ...formData, user_prompt_template: e.target.value })}
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="User prompt template with {{variables}}..."
              />
              <p className="text-sm text-gray-500 mt-2">
                Available variables: {`{{questionCount}}, {{exerciseType}}, {{topic}}, {{level}}, {{difficulty}}, {{topicDescription}}, {{existingQuestionsContext}}`}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}