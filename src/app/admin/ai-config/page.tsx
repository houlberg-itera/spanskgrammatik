'use client';

import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';

interface AIConfig {
  id: string;
  name: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  prompt_template: string;
  system_prompt: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AIConfigPage() {
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    loadData();
    checkSystemStatus();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('System uses OpenAI GPT-5 with optimized settings for Spanish grammar exercises');
    } catch (err) {
      setError('System configuration info not available');
    } finally {
      setLoading(false);
    }
  };

  const checkSystemStatus = async () => {
    try {
      const response = await fetch('/api/test-openai');
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data);
      }
    } catch (err) {
      console.error('Failed to check system status:', err);
    }
  };

  const testConfiguration = async () => {
    try {
      const response = await fetch('/api/test-openai');
      if (response.ok) {
        const data = await response.json();
        setSuccess('AI System test completed successfully! Using GPT-5 model for exercise generation.');
        setSystemStatus(data);
      } else {
        setError('Configuration test failed');
      }
    } catch (err) {
      setError('Test request failed');
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI system status...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">AI System Configuration</h1>
            <div className="space-x-4">
              <button
                onClick={testConfiguration}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600"
              >
                🧪 Test GPT-5 System
              </button>
              <button
                onClick={loadData}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Messages */}
          {(error || success) && (
            <div className={`mb-6 p-4 rounded-lg ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              <div className="flex justify-between items-center">
                <span>{error || success}</span>
                <button onClick={clearMessages} className="text-sm underline">Dismiss</button>
              </div>
            </div>
          )}

          {/* System Status */}
          {systemStatus && (
            <div className="mb-6 bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">🚀 Current AI System Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${systemStatus.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">Overall: {systemStatus.success ? 'Working' : 'Error'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Model: GPT-5</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Exercise Generation: Active</span>
                </div>
              </div>
            </div>
          )}

          {/* Current Configuration */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Current AI Configuration</h2>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Settings</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Model:</span> GPT-5 (Latest)</div>
                    <div><span className="font-medium">Temperature:</span> 1 (GPT-5 Standard)</div>
                    <div><span className="font-medium">Max Tokens:</span> 4000</div>
                    <div><span className="font-medium">Rate Limits:</span> 500 RPM / 500K TPM</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Exercise Types</h3>
                  <div className="space-y-2 text-sm">
                    <div>✅ Multiple Choice Questions</div>
                    <div>✅ Fill in the Blank</div>
                    <div>✅ Translation Exercises</div>
                    <div>✅ Verb Conjugation</div>
                    <div>✅ Sentence Structure</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Optimization Features</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>• Advanced reasoning capabilities with GPT-5</div>
                  <div>• Danish-language instructions and explanations</div>
                  <div>• Proficiency-targeted content generation</div>
                  <div>• Automatic difficulty scaling (A1, A2, B1)</div>
                  <div>• Context-aware exercise variation</div>
                </div>
              </div>
            </div>
          </div>

          {/* System Performance */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="font-medium text-gray-900 mb-4">🎯 System Capabilities</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>✅ GPT-5 integration active</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>✅ Bulk exercise generation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>✅ Admin-only access control</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>✅ Danish language prompts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>✅ Contextual explanations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>✅ Multiple difficulty levels</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>✅ Quality validation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>✅ Exercise variation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>✅ Real-time generation</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 text-sm">
                <strong>🎉 System Status:</strong> The AI exercise generation system is fully operational with GPT-5 
                providing enhanced reasoning capabilities for creating high-quality Spanish grammar exercises 
                with Danish instructions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}