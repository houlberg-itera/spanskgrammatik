'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DuplicateContentPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleDuplicate = async () => {
    if (!confirm('Are you sure you want to duplicate Spanish content to Portuguese? This will create new topics and exercises.')) {
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/admin/duplicate-content-for-language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceLanguage: 'es',
          targetLanguage: 'pt'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to duplicate content');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/dashboard" className="text-blue-600 hover:text-blue-700">
            ← Back to Admin Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Duplicate Content for New Language
          </h1>
          <p className="text-gray-600 mb-6">
            This tool will duplicate all Spanish topics and exercises for Portuguese.
            Spanish content will be used as fallback for Portuguese fields that don't have translations yet.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <span className="text-yellow-600 text-xl mr-3">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-800 mb-1">Important Notes:</h3>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>This will create NEW topics and exercises with target_language = 'pt'</li>
                  <li>Existing Portuguese content will be skipped (no duplicates)</li>
                  <li>Spanish text will be used as placeholder for Portuguese fields</li>
                  <li>You should translate the Portuguese fields afterward</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={handleDuplicate}
            disabled={loading}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Duplicating Content...' : 'Duplicate Spanish Content to Portuguese'}
          </button>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-red-600 text-xl mr-3">❌</span>
                <div>
                  <h3 className="font-semibold text-red-800 mb-1">Error</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-start mb-4">
                <span className="text-green-600 text-2xl mr-3">✅</span>
                <div>
                  <h3 className="font-semibold text-green-800 text-lg mb-1">Success!</h3>
                  <p className="text-sm text-green-700">Content duplicated successfully</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">📚 Topics</h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600">Found: <span className="font-semibold text-gray-900">{result.topics.found}</span></p>
                    <p className="text-green-600">Created: <span className="font-semibold">{result.topics.created}</span></p>
                    <p className="text-gray-500">Skipped: <span className="font-semibold">{result.topics.skipped}</span></p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">📝 Exercises</h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600">Found: <span className="font-semibold text-gray-900">{result.exercises.found}</span></p>
                    <p className="text-green-600">Created: <span className="font-semibold">{result.exercises.created}</span></p>
                    <p className="text-gray-500">Skipped: <span className="font-semibold">{result.exercises.skipped}</span></p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Next Steps:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Switch your user account to Portuguese in settings</li>
                  <li>Navigate to a level page to see the duplicated content</li>
                  <li>Use AI to generate proper Portuguese translations</li>
                  <li>Update Portuguese field values in the database</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
