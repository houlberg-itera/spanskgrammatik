'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DuplicateExercisesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleDuplicate = async () => {
    if (!confirm('Duplicate exercises from Spanish topics to existing Portuguese topics?')) {
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/admin/duplicate-exercises-only', {
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
        throw new Error(data.error || 'Failed to duplicate exercises');
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
            Duplicate Exercises Only
          </h1>
          <p className="text-gray-600 mb-6">
            This tool will duplicate exercises from Spanish topics to existing Portuguese topics.
            It maps topics by name and level, then creates Portuguese exercises.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <span className="text-blue-600 text-xl mr-3">ℹ️</span>
              <div>
                <h3 className="font-semibold text-blue-800 mb-1">How it works:</h3>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Finds Spanish topics and their Portuguese equivalents by matching name_da and level</li>
                  <li>Creates a mapping of Spanish topic ID → Portuguese topic ID</li>
                  <li>Duplicates each Spanish exercise to the corresponding Portuguese topic</li>
                  <li>Skips exercises that already exist</li>
                  <li>Uses generic fields (question, explanation) with Spanish content as placeholder</li>
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
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {loading ? 'Duplicating Exercises...' : 'Duplicate Exercises for Portuguese Topics'}
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
                  <p className="text-sm text-green-700">Exercises duplicated successfully</p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">Topics Mapped: <span className="font-semibold text-gray-900">{result.topicsMapped}</span></p>
                  <p className="text-gray-600">Exercises Found: <span className="font-semibold text-gray-900">{result.exercises.found}</span></p>
                  <p className="text-green-600">Created: <span className="font-semibold">{result.exercises.created}</span></p>
                  <p className="text-gray-500">Skipped: <span className="font-semibold">{result.exercises.skipped}</span></p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Next Steps:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Portuguese topics now have exercises!</li>
                  <li>Switch to Portuguese in settings to test</li>
                  <li>Navigate to a level page - you should see Portuguese content</li>
                  <li>Update Portuguese field values with proper translations later</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
