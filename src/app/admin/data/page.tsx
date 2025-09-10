'use client';

import { useState } from 'react';

interface LoadResult {
  message: string;
  results?: Array<{ exercise: number; success?: boolean; error?: string; id?: number }>;
  totalExercises?: number;
  errors?: number;
  success?: number;
  error?: string;
}

interface CheckResult {
  totalExercises: number;
  exercises: Array<{
    id: number;
    title: string;
    level: string;
    type: string;
    aiGenerated: boolean;
  }>;
  error?: string;
}

export default function AdminDataLoader() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<LoadResult | CheckResult | null>(null);

  const loadSampleData = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/load-sample-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data: LoadResult = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ 
        message: 'Failed to load sample data', 
        error: (error as Error).message 
      });
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentData = async () => {
    setChecking(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/load-sample-data');
      const data: CheckResult = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ 
        totalExercises: 0,
        exercises: [],
        error: (error as Error).message 
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">🔧 Admin: Database Management</h1>
      
      <div className="space-y-4 mb-6">
        <div className="flex space-x-4">
          <button
            onClick={checkCurrentData}
            disabled={checking}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Check Current Data'}
          </button>
          
          <button
            onClick={loadSampleData}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load Sample Exercises'}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Result:</h2>
          
          {result.error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {result.error}
            </div>
          )}

          {'message' in result && result.message && (
            <div className="mb-4">
              <strong>Message:</strong> {result.message}
            </div>
          )}

          {'totalExercises' in result && (
            <div className="mb-4">
              <strong>Total Exercises:</strong> {result.totalExercises}
            </div>
          )}

          {'results' in result && result.results && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Load Results:</h3>
              <ul className="space-y-1">
                {result.results.map((res, i) => (
                  <li key={i} className={`text-sm ${res.success ? 'text-green-600' : 'text-red-600'}`}>
                    Exercise {res.exercise}: {res.success ? `✅ Success (ID: ${res.id})` : `❌ ${res.error}`}
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-sm text-gray-600">
                Success: {result.success}, Errors: {result.errors}
              </div>
            </div>
          )}

          {'exercises' in result && result.exercises && (
            <div>
              <h3 className="font-semibold mb-2">Current Exercises:</h3>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Title</th>
                      <th className="text-left p-2">Level</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">AI Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.exercises.map((ex) => (
                      <tr key={ex.id} className="border-b">
                        <td className="p-2">{ex.id}</td>
                        <td className="p-2">{ex.title}</td>
                        <td className="p-2">{ex.level}</td>
                        <td className="p-2">{ex.type}</td>
                        <td className="p-2">{ex.aiGenerated ? '🤖 Yes' : '📝 No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <details className="mt-4">
            <summary className="cursor-pointer font-semibold">Raw JSON Response</summary>
            <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <div className="mt-8 bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">ℹ️ About Sample Data</h3>
        <p className="text-yellow-700 text-sm">
          Sample exercises are needed because the current database only has 2 AI-generated exercises.
          Users need a variety of structured exercises to progress through the learning levels.
          Loading sample data will add pre-built exercises covering topics like articles (el/la), 
          ser vs estar, verb conjugations, and more.
        </p>
      </div>
    </div>
  );
}
