'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConversationPractice from '@/components/ConversationPractice';

interface Dialogue {
  id: string;
  sequence_order: number;
  speaker_role: string;
  text: string;
  text_translation: string | null;
  audio_url: string | null;
  hints_da: string[] | null;
  is_user_turn: boolean;
  expected_response: string | null;
}

interface ConversationScenario {
  id: string;
  title_da: string;
  title: string;
  description_da: string | null;
  description: string | null;
  target_language: 'es' | 'pt';
  level: string;
  context_da: string | null;
  context: string | null;
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ConversationPracticePage({ params }: PageProps) {
  const router = useRouter();
  const [scenario, setScenario] = useState<ConversationScenario | null>(null);
  const [dialogues, setDialogues] = useState<Dialogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    loadScenario();
  }, []);

  async function loadScenario() {
    try {
      const resolvedParams = await params;
      const response = await fetch(`/api/conversation/scenarios/${resolvedParams.id}`);
      
      if (!response.ok) {
        throw new Error('Scenario ikke fundet');
      }

      const data = await response.json();
      setScenario(data.scenario);
      setDialogues(data.dialogues || []);
    } catch (err) {
      console.error('Failed to load scenario:', err);
      setError(err instanceof Error ? err.message : 'Kunne ikke indlæse samtale');
    } finally {
      setLoading(false);
    }
  }

  function handleComplete(score: number) {
    setFinalScore(score);
    setCompleted(true);
  }

  function handleRestart() {
    setCompleted(false);
    setFinalScore(0);
    loadScenario();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Indlæser samtale...</p>
        </div>
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold mb-2">Noget gik galt</h2>
          <p className="text-gray-600 mb-6">{error || 'Samtalen blev ikke fundet'}</p>
          <button
            onClick={() => router.push('/conversation')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Tilbage til oversigten
          </button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">Tillykke!</h2>
          <p className="text-gray-600 mb-6">
            Du har gennemført samtalen <strong>{scenario.title_da}</strong>
          </p>

          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <div className="text-sm text-gray-600 mb-2">Din score</div>
            <div className="text-5xl font-bold text-blue-600 mb-2">{finalScore}%</div>
            <div className="text-sm text-gray-600">
              {finalScore >= 80 && 'Fremragende præstation! 🌟'}
              {finalScore >= 60 && finalScore < 80 && 'Godt arbejde! 👍'}
              {finalScore < 60 && 'Bliv ved med at øve! 💪'}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRestart}
              className="flex-1 px-6 py-3 border rounded-lg hover:bg-gray-50"
            >
              Øv igen
            </button>
            <button
              onClick={() => router.push('/conversation')}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Vælg ny samtale
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <ConversationPractice
        scenario={scenario}
        dialogues={dialogues}
        onComplete={handleComplete}
      />
    </div>
  );
}
