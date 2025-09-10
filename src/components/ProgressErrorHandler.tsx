'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ProgressErrorHandlerProps {
  exerciseId: number;
  score: number;
  onRetrySuccess: () => void;
  onCancel: () => void;
}

export default function ProgressErrorHandler({ exerciseId, score, onRetrySuccess, onCancel }: ProgressErrorHandlerProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const supabase = createClient();

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      console.log('Retrying progress save for exercise:', exerciseId, 'score:', score);
      
      // Use direct database operations instead of problematic RPC function
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // Check if progress already exists
      const { data: existingProgress, error: checkError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId)
        .single();

      let saveResult;
      if (existingProgress) {
        // Update existing progress
        const { data, error } = await supabase
          .from('user_progress')
          .update({
            score: score,
            completed: score >= 70,
            attempts: (existingProgress.attempts || 0) + 1,
            completed_at: score >= 70 ? new Date().toISOString() : existingProgress.completed_at,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('exercise_id', exerciseId)
          .select();
        
        saveResult = { data, error };
      } else {
        // Insert new progress
        const { data, error } = await supabase
          .from('user_progress')
          .insert({
            user_id: user.id,
            exercise_id: exerciseId,
            completed: score >= 70,
            score: score,
            attempts: 1,
            completed_at: score >= 70 ? new Date().toISOString() : null
          })
          .select();
        
        saveResult = { data, error };
      }

      if (saveResult.error) {
        console.error('Retry failed:', saveResult.error);
        setDebugInfo({
          error: saveResult.error.message,
          code: saveResult.error.code,
          details: saveResult.error.details,
          hint: saveResult.error.hint,
          timestamp: new Date().toISOString()
        });
        alert('Forsøget mislykkedes igen. Fejl: ' + saveResult.error.message);
      } else {
        console.log('Retry successful:', saveResult.data);
        alert('Fremgang gemt succesfuldt!');
        onRetrySuccess();
      }
    } catch (error) {
      console.error('Retry error:', error);
      alert('Uventet fejl under forsøg: ' + (error instanceof Error ? error.message : 'Ukendt fejl'));
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDiagnostics = async () => {
    try {
      setShowDebug(true);
      console.log('Running diagnostics...');
      
      // Test database connectivity
      const response = await fetch('/api/debug-database');
      const debugData = await response.json();
      
      // Test specific progress saving
      const testResponse = await fetch('/api/test-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exerciseId,
          score
        })
      });
      const testData = await testResponse.json();
      
      setDebugInfo({
        ...debugData,
        progressTest: testData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Diagnostics error:', error);
      setDebugInfo({
        error: 'Kunne ikke køre diagnostik',
        message: error instanceof Error ? error.message : 'Ukendt fejl',
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
            <span className="text-red-600 text-lg">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Fremgang kunne ikke gemmes
          </h3>
        </div>
        
        <p className="text-gray-600 mb-6">
          Din øvelse blev gennemført, men din fremgang kunne ikke gemmes i databasen.
          Du kan prøve igen eller fortsætte uden at gemme.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
          >
            {isRetrying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Prøver igen...
              </>
            ) : (
              '🔄 Prøv igen'
            )}
          </button>
          
          <button
            onClick={handleRefresh}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
          >
            🔄 Opdater siden
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700"
          >
            🚪 Log ud og ind igen
          </button>
          
          <button
            onClick={handleDiagnostics}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
          >
            🔍 Kør diagnostik
          </button>
          
          <button
            onClick={onCancel}
            className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
          >
            ❌ Fortsæt uden at gemme
          </button>
        </div>
        
        {showDebug && debugInfo && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Diagnostik info:</h4>
            <pre className="text-xs text-gray-600 overflow-auto max-h-40">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        {debugInfo?.progressTest?.success && (
          <div className="mt-4 p-3 bg-green-100 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Test af progress-gemning lykkedes! Fremgangen er nu gemt.
            </p>
            <button
              onClick={onRetrySuccess}
              className="mt-2 text-sm bg-green-600 text-white px-3 py-1 rounded"
            >
              Fortsæt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
