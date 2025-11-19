'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { TargetLanguage } from '@/types/database';

interface ConversationScenario {
  id: string;
  title_da: string;
  title: string;
  description_da: string | null;
  target_language: 'es' | 'pt';
  level: string;
  difficulty_score: number;
}

export default function ConversationListPage() {
  const router = useRouter();
  const supabase = createClient();
  const [scenarios, setScenarios] = useState<ConversationScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLanguage, setUserLanguage] = useState<TargetLanguage | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('');

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    if (userLanguage) {
      fetchScenarios();
    }
  }, [userLanguage, selectedLevel]);

  async function fetchUserLanguage() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('target_language')
        .eq('id', user.id)
        .single();

      setUserLanguage(userData?.target_language || 'es');
    } catch (error) {
      console.error('Failed to fetch user language:', error);
      setUserLanguage('es'); // Fallback
    }
  }

  async function fetchScenarios() {
    if (!userLanguage) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        language: userLanguage
      });
      
      if (selectedLevel) {
        params.append('level', selectedLevel);
      }

      const response = await fetch(`/api/conversation/scenarios?${params}`);
      
      if (!response.ok) throw new Error('Failed to fetch scenarios');

      const data = await response.json();
      setScenarios(data.scenarios || []);
    } catch (error) {
      console.error('Failed to fetch scenarios:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!userLanguage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Indlæser...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Samtale-øvelser</h1>
          <p className="text-gray-600">
            Øv dig i at føre samtaler på {userLanguage === 'es' ? 'spansk' : 'portugisisk'} med AI-drevne dialoger
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4 flex-wrap">
            {/* Level Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Niveau</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedLevel('')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedLevel === ''
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Alle
                </button>
                {['A1', 'A2', 'B1'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(level)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedLevel === level
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Indlæser samtaler...</p>
          </div>
        )}

        {/* Scenarios Grid */}
        {!loading && scenarios.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenarios.map((scenario) => (
              <Link
                key={scenario.id}
                href={`/conversation/${scenario.id}`}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg">{scenario.title_da}</h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                    {scenario.level}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  {scenario.description_da || scenario.title}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {scenario.target_language === 'es' ? '🇪🇸 Spansk' : '🇵🇹 Portugisisk'}
                  </span>
                  <span className="text-sm text-blue-600 font-medium">
                    Start →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && scenarios.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 mb-4">
              Ingen samtaler fundet for de valgte filtre
            </p>
            <button
              onClick={() => setSelectedLevel('')}
              className="text-blue-600 hover:text-blue-700"
            >
              Nulstil filtre
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
