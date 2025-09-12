'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AIConfigPage() {
  const [configs, setConfigs] = useState<AIConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<AIConfiguration | null>(null);
  const [showForm, setShowForm] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_configurations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (config: Partial<AIConfiguration>) => {
    try {
      if (editingConfig) {
        // Update existing
        const { error } = await supabase
          .from('ai_configurations')
          .update({
            ...config,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingConfig.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('ai_configurations')
          .insert([config]);

        if (error) throw error;
      }

      setEditingConfig(null);
      setShowForm(false);
      fetchConfigurations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      const { error } = await supabase
        .from('ai_configurations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchConfigurations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete configuration');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading AI configurations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Configuration Management</h1>
              <p className="mt-2 text-gray-600">
                Manage dynamic prompts and models for exercise generation
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Dashboard
              </Link>
              <button
                onClick={() => {
                  setEditingConfig(null);
                  setShowForm(true);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New Configuration
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

        {/* Test API Button */}
        <div className="mb-6">
          <button
            onClick={() => window.open('/api/test-openai', '_blank')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            🧪 Test AI Configuration System
          </button>
        </div>

        {/* Configurations List */}
        <div className="grid gap-6">
          {configs.map((config) => (
            <div key={config.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">{config.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      config.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {config.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {config.model_name}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{config.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-500">Temperature</span>
                      <p className="font-medium">{config.temperature}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Max Tokens</span>
                      <p className="font-medium">{config.max_tokens}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Created</span>
                      <p className="font-medium">{new Date(config.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Updated</span>
                      <p className="font-medium">{new Date(config.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-sm text-gray-500">System Prompt (first 100 chars)</span>
                    <p className="text-sm bg-gray-50 p-2 rounded mt-1 font-mono">
                      {config.system_prompt?.substring(0, 100)}...
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => {
                      setEditingConfig(config);
                      setShowForm(true);
                    }}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {configs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No AI configurations found</p>
              <button
                onClick={() => {
                  setEditingConfig(null);
                  setShowForm(true);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Configuration
              </button>
            </div>
          )}
        </div>

        {/* Edit/Create Form Modal */}
        {showForm && (
          <AIConfigForm
            config={editingConfig}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingConfig(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Form Component
function AIConfigForm({ 
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
    max_tokens: config?.max_tokens || 1500,
    system_prompt: config?.system_prompt || '',
    user_prompt_template: config?.user_prompt_template || '',
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {config ? 'Edit Configuration' : 'New Configuration'}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Configuration Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <select
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-5">GPT-5</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt
              </label>
              <textarea
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter system prompt with template variables like {{level}}, {{topic}}, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Prompt Template
              </label>
              <textarea
                value={formData.user_prompt_template}
                onChange={(e) => setFormData({ ...formData, user_prompt_template: e.target.value })}
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter user prompt template with variables like {{questionCount}}, {{exerciseType}}, etc."
              />
            </div>
          </div>

          <div className="flex gap-4 mt-6 pt-6 border-t">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {config ? 'Update Configuration' : 'Create Configuration'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}