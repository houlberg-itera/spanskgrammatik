'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AIConfiguration {
  id: number;
  name: string;
  description: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  user_prompt_template: string;
  reasoning_instructions?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TestResult {
  success: boolean;
  result?: any;
  error?: string;
  model_info?: {
    model: string;
    response_time: number;
    tokens_used?: number;
  };
}

interface TestConfiguration {
  topic: string;
  level: string;
  questionCount: number;
  exerciseType: string;
  difficulty: string;
  instructions: string;
  model: string;
  temperature: number;
  maxTokens: number;
  target_language: 'es' | 'pt';
  topicData?: {
    id: number;
    level: string;
    name_da: string;
    name_es: string;
    description_da?: string;
    description_es?: string;
    exercise_count: number;
  };
}

export default function AIConfigPage() {
  const [configs, setConfigs] = useState<AIConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTestForm, setShowTestForm] = useState(false);
  const [testingConfig, setTestingConfig] = useState<AIConfiguration | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AIConfiguration | null>(null);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai-config');
      const data = await response.json();
      
      if (data.success) {
        setConfigs(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch configurations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      const response = await fetch(`/api/ai-config/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchConfigurations();
      } else {
        setError('Failed to delete configuration');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete configuration');
    }
  };

  const handleSave = async (formData: Partial<AIConfiguration>) => {
    try {
      setLoading(true);
      setError(null);
      
      const configData = {
        ...(editingConfig && { id: editingConfig.id }),
        name: formData.name,
        description: formData.description || '',
        model_name: formData.model_name,
        temperature: formData.temperature || 0.7,
        max_tokens: formData.max_tokens || 1000,
        system_prompt: formData.system_prompt || '',
        user_prompt_template: formData.user_prompt_template || '',
        reasoning_instructions: formData.reasoning_instructions || null,
        is_active: formData.is_active ?? true
      };

      const url = '/api/ai-config';
      const method = editingConfig ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      });

      if (response.ok) {
        setShowForm(false);
        setEditingConfig(null);
        await fetchConfigurations();
      } else {
        const data = await response.json();
        setError(data.error || `Failed to ${editingConfig ? 'update' : 'create'} configuration`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingConfig ? 'update' : 'create'} configuration`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading AI configurations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex items-center space-x-2 text-sm mb-6">
            <Link href="/admin/dashboard" className="text-blue-600 hover:text-blue-800">
              Admin Dashboard
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">AI Configuration</span>
          </nav>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🤖 AI Configuration</h1>
              <p className="text-gray-600 mt-2">
                Manage and test OpenAI models and prompts
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setEditingConfig(null);
                  setShowForm(true);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                ➕ Create Configuration
              </button>
              <button
                onClick={() => window.open('/api/test-openai', '_blank')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                🧪 Test API Connection
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Configuration Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{configs.length}</div>
            <div className="text-gray-600">Total Configurations</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {configs.filter(c => c.is_active).length}
            </div>
            <div className="text-gray-600">Active Configurations</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(configs.map(c => c.model_name)).size}
            </div>
            <div className="text-gray-600">Unique Models</div>
          </div>
        </div>

        {/* Configurations List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Current Configurations</h2>
          </div>
          
          {configs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No AI configurations found</p>
              <p className="text-sm text-gray-400 mt-2">
                Configurations will appear here when created through the database
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temperature</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Tokens</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {configs.map((config) => (
                    <tr key={config.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{config.name}</div>
                        <div className="text-sm text-gray-500">{config.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                          {config.model_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {config.temperature}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {config.max_tokens}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          config.is_active 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {config.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditingConfig(config);
                            setShowForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => {
                            setTestingConfig(config);
                            setShowTestForm(true);
                          }}
                          className="text-green-600 hover:text-green-900 mr-4"
                        >
                          🧪 Test
                        </button>
                        <button
                          onClick={() => handleDelete(config.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Test Configuration Modal */}
      {showTestForm && testingConfig && (
        <TestConfigurationForm
          config={testingConfig}
          onClose={() => {
            setShowTestForm(false);
            setTestingConfig(null);
          }}
        />
      )}

      {/* Create/Edit Configuration Modal */}
      {showForm && (
        <ConfigurationForm
          config={editingConfig}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingConfig(null);
          }}
        />
      )}
    </div>
  );
}

// Test Configuration Form Component
function TestConfigurationForm({ 
  config, 
  onClose 
}: { 
  config: AIConfiguration;
  onClose: () => void;
}) {
  const [testConfig, setTestConfig] = useState<TestConfiguration>({
    topic: '',
    level: 'A1',
    questionCount: 1,
    exerciseType: 'multiple_choice',
    difficulty: 'easy',
    instructions: 'Test instructions for the AI',
    model: config.model_name,
    temperature: config.temperature,
    maxTokens: config.max_tokens,
    target_language: 'es',
  });
  
  // State for topics from database
  const [topics, setTopics] = useState<Array<{
    id: number;
    level: string;
    name_da: string;
    name_es: string;
    description_da?: string;
    exercise_count: number;
  }>>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch topics based on current level
  const fetchTopics = async (level: string, target_language: string) => {
    setTopicsLoading(true);
    setTopicsError(null);
    
    try {
      const response = await fetch(`/api/admin/topics?level=${level}&target_language=${target_language}`);
      if (!response.ok) {
        throw new Error('Failed to fetch topics');
      }
      
      const data = await response.json();
      setTopics(data.topics || []);
      
      // Reset topic selection when level changes and set to first topic if available
      if (data.topics && data.topics.length > 0) {
        setTestConfig(prev => ({ 
          ...prev, 
          topic: data.topics[0].name_es
        }));
      } else {
        setTestConfig(prev => ({ 
          ...prev, 
          topic: ''
        }));
      }
    } catch (err) {
      setTopicsError(err instanceof Error ? err.message : 'Failed to fetch topics');
      setTopics([]);
    } finally {
      setTopicsLoading(false);
    }
  };

  // Fetch topics when component mounts or level changes
  useEffect(() => {
    fetchTopics(testConfig.level, testConfig.target_language);
  }, [testConfig.level, testConfig.target_language]);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test-ai-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configId: config.id,
          configName: config.name,
          model: testConfig.model, // Use selected model instead of config default
          temperature: testConfig.temperature, // Use selected temperature instead of config default
          maxTokens: testConfig.maxTokens, // Use selected maxTokens instead of config default
          systemPrompt: config.system_prompt,
          userPromptTemplate: config.user_prompt_template,
          testParams: testConfig
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              🧪 Test Configuration: {config.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Configuration Details */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Configuration Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Model:</strong> {config.model_name}</div>
              <div><strong>Temperature:</strong> {config.temperature}</div>
              <div><strong>Max Tokens:</strong> {config.max_tokens}</div>
              <div><strong>Status:</strong> {config.is_active ? 'Active' : 'Inactive'}</div>
            </div>
          </div>

          {/* Test Parameters */}
          <div className="mb-6">
            <h3 className="font-semibold mb-4">Test Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Topic
                </label>
                <select
                  value={testConfig.topic ?? ''}
                  onChange={(e) => {
                    const selectedTopic = topics.find(t => t.name_es === e.target.value);
                    setTestConfig({ 
                      ...testConfig, 
                      topic: e.target.value,
                      topicData: selectedTopic 
                    });
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={topicsLoading}
                >
                  {topicsLoading ? (
                    <option value="">Loading topics...</option>
                  ) : topicsError ? (
                    <option value="">Error loading topics</option>
                  ) : topics.length === 0 ? (
                    <option value="">No topics available for {testConfig.level}</option>
                  ) : (
                    <>
                      <option value="">Select a topic</option>
                      {topics.map((topic) => (
                        <option key={topic.id} value={topic.name_es}>
                          {topic.name_es} ({topic.name_da}) - {topic.exercise_count} exercises
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {topicsError && (
                  <p className="mt-1 text-sm text-red-600">{topicsError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Level
                </label>
                <select
                  value={testConfig.level}
                  onChange={(e) => setTestConfig({ ...testConfig, level: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Language
                </label>
                <select
                  value={testConfig.target_language}
                  onChange={(e) => setTestConfig({ ...testConfig, target_language: e.target.value as 'es' | 'pt' })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="es">🇪🇸 Spanish</option>
                  <option value="pt">🇵🇹 Portuguese</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Count
                </label>
                <select
                  value={testConfig.questionCount}
                  onChange={(e) => setTestConfig({ ...testConfig, questionCount: parseInt(e.target.value) })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 question</option>
                  <option value={3}>3 questions</option>
                  <option value={5}>5 questions</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exercise Type
                </label>
                <select
                  value={testConfig.exerciseType}
                  onChange={(e) => setTestConfig({ ...testConfig, exerciseType: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="fill_in_blank">Fill in Blank</option>
                  <option value="translation">Translation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty
                </label>
                <select
                  value={testConfig.difficulty}
                  onChange={(e) => setTestConfig({ ...testConfig, difficulty: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model
                </label>
                <select
                  value={testConfig.model}
                  onChange={(e) => setTestConfig({ ...testConfig, model: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gpt-4o">GPT-4o (Latest)</option>
                  <option value="gpt-4">GPT-4 (Stable)</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast)</option>
                  <option value="gpt-5">GPT-5 (Preview)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Choose the AI model to test with (overrides config default)
                </p>
              </div>
            </div>

            {/* Advanced Parameters */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Advanced Parameters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperature: {testConfig.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={testConfig.temperature}
                    onChange={(e) => setTestConfig({ ...testConfig, temperature: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0 (Focused)</span>
                    <span>1 (Balanced)</span>
                    <span>2 (Creative)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Tokens: {testConfig.maxTokens}
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="4000"
                    step="100"
                    value={testConfig.maxTokens}
                    onChange={(e) => setTestConfig({ ...testConfig, maxTokens: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>100</span>
                    <span>2000</span>
                    <span>4000</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Instructions
              </label>
              <textarea
                value={testConfig.instructions}
                onChange={(e) => setTestConfig({ ...testConfig, instructions: e.target.value })}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Additional instructions for the AI..."
              />
            </div>
          </div>

          {/* Test Button */}
          <div className="mb-6">
            <button
              onClick={handleTest}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Testing Configuration...
                </span>
              ) : (
                '🚀 Run Test'
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="mb-6">
              <h3 className="font-semibold mb-4 flex items-center">
                {result.success ? '✅' : '❌'} Test Results
              </h3>
              
              {result.success ? (
                <div className="space-y-4">
                  {/* Model Info */}
                  {result.model_info && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Model Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Model:</strong> {result.model_info.model}
                        </div>
                        <div>
                          <strong>Response Time:</strong> {result.model_info.response_time}ms
                        </div>
                        {result.model_info.tokens_used && (
                          <div>
                            <strong>Tokens Used:</strong> {result.model_info.tokens_used}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Generated Exercise */}
                  {(result as any).exercise && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">Generated Exercise Preview</h4>
                      <div className="space-y-3">
                        {/* Exercise Title */}
                        {(result as any).exercise.title && (
                          <div className="text-xl font-bold text-gray-900 mb-4">
                            {(result as any).exercise.title}
                          </div>
                        )}
                        
                        {/* Instructions */}
                        {(result as any).exercise.instructions_da && (
                          <div className="text-sm text-gray-700 mb-4 italic">
                            {(result as any).exercise.instructions_da}
                          </div>
                        )}
                        
                        {/* Questions - Rendered like actual exercise */}
                        {(result as any).exercise.questions && (result as any).exercise.questions.length > 0 && (
                          <div className="space-y-4">
                            {(result as any).exercise.questions.map((question: any, index: number) => (
                              <div key={index} className="p-6 border rounded-lg bg-white">
                                {/* Danish instruction (question_da) */}
                                {question.question_da && (
                                  <h3 className="text-lg font-medium mb-4">{question.question_da}</h3>
                                )}
                                
                                {/* Target language sentence with blank (question) */}
                                {question.question && (
                                  <div className="mb-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-start space-x-2">
                                      <span className="text-amber-600 text-sm">🔤</span>
                                      <div>
                                        <p className="text-sm font-medium text-amber-800">{question.question}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Danish translation (sentence_translation_da) */}
                                {question.sentence_translation_da && (
                                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-start space-x-2">
                                      <span className="text-blue-600 text-sm">💡</span>
                                      <div>
                                        <p className="text-xs font-medium text-blue-700 mb-1">Dansk oversættelse:</p>
                                        <p className="text-sm text-blue-800">{question.sentence_translation_da}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Input field simulation */}
                                <input
                                  type="text"
                                  disabled
                                  className="w-full p-3 border rounded bg-gray-50 cursor-not-allowed mb-3"
                                  placeholder="Udfyld det manglende ord..."
                                />
                                
                                {/* Options (for multiple choice) */}
                                {question.options && Array.isArray(question.options) && (
                                  <div className="space-y-2 mb-3">
                                    {question.options.map((option: string, optIdx: number) => (
                                      <div key={optIdx} className="p-3 border rounded hover:bg-gray-50 cursor-pointer">
                                        {option}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Correct answer (admin view) */}
                                {question.correct_answer && (
                                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                                    <p className="text-xs font-medium text-green-700 mb-1">✓ Correct Answer:</p>
                                    <p className="text-sm font-semibold text-green-800">{question.correct_answer}</p>
                                  </div>
                                )}
                                
                                {/* Explanation */}
                                {question.explanation_da && (
                                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
                                    <p className="text-xs font-medium text-purple-700 mb-1">📚 Explanation:</p>
                                    <p className="text-sm text-purple-800">{question.explanation_da}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Complete API Response */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Complete API Response JSON</h4>
                      <pre className="text-xs bg-white p-3 rounded border overflow-x-auto max-h-64">
{JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                </div>
              ) : (
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-red-800">{result.error}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
            {result && (
              <button
                onClick={() => {
                  setResult(null);
                  setError(null);
                }}
                className="px-6 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                🔄 Test Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Configuration Form Component
function ConfigurationForm({
  config,
  onSave,
  onCancel
}: {
  config: AIConfiguration | null;
  onSave: (config: Partial<AIConfiguration>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: config?.name || '',
    description: config?.description || '',
    model_name: config?.model_name || 'gpt-4o',
    temperature: config?.temperature || 0.7,
    max_tokens: config?.max_tokens || 2000,
    system_prompt: config?.system_prompt || '',
    user_prompt_template: config?.user_prompt_template || '',
    reasoning_instructions: config?.reasoning_instructions || '',
    is_active: config?.is_active ?? true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Configuration name is required';
    }

    if (!formData.model_name.trim()) {
      newErrors.model_name = 'Model name is required';
    }

    if (formData.temperature < 0 || formData.temperature > 2) {
      newErrors.temperature = 'Temperature must be between 0 and 2';
    }

    if (formData.max_tokens < 1 || formData.max_tokens > 4000) {
      newErrors.max_tokens = 'Max tokens must be between 1 and 4000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {config ? 'Edit Configuration' : 'Create Configuration'}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <span className="sr-only">Close</span>
              <span className="text-2xl">×</span>
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Configuration Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Configuration Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter configuration name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter description (optional)"
              />
            </div>

            {/* Model and Settings Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Model Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model *
                </label>
                <select
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.model_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-5">GPT-5</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
                {errors.model_name && <p className="mt-1 text-sm text-red-600">{errors.model_name}</p>}
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature
                </label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.temperature ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.temperature && <p className="mt-1 text-sm text-red-600">{errors.temperature}</p>}
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="1"
                  max="4000"
                  value={formData.max_tokens}
                  onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.max_tokens ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.max_tokens && <p className="mt-1 text-sm text-red-600">{errors.max_tokens}</p>}
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Active Configuration
              </label>
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt
              </label>
              <textarea
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter system prompt with template variables like {level}, {topic}, etc."
              />
              <p className="mt-1 text-sm text-gray-500">
                Use template variables: {"{level}, {topic}, {exerciseType}, {difficulty}"}
              </p>
            </div>

            {/* User Prompt Template */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Prompt Template
              </label>
              <textarea
                value={formData.user_prompt_template}
                onChange={(e) => setFormData({ ...formData, user_prompt_template: e.target.value })}
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter user prompt template with variables like {questionCount}, {exerciseType}, etc."
              />
              <p className="mt-1 text-sm text-gray-500">
                Use template variables: {"{questionCount}, {exerciseType}, {difficulty}, {topicName}, {topicDescription}"}
              </p>
            </div>

            {/* Reasoning Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reasoning Instructions
                <span className="ml-2 text-sm font-normal text-gray-500">(Optional - GPT-5/o1 models only)</span>
              </label>
              <textarea
                value={formData.reasoning_instructions || ''}
                onChange={(e) => setFormData({ ...formData, reasoning_instructions: e.target.value })}
                rows={8}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional custom reasoning instructions for GPT-5/o1 models. Leave empty to use hardcoded defaults."
              />
              <p className="mt-1 text-sm text-gray-600">
                💡 These instructions are <strong>only applied when using GPT-5 or o1 models</strong>. If left empty, the system will use hardcoded default reasoning instructions optimized for complete JSON exercise generation. Custom instructions override the defaults.
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 mt-8 pt-6 border-t">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {config ? 'Update Configuration' : 'Create Configuration'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}