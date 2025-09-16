'use client';

import { useState, useEffect } from 'react';
import { SpanishLevel } from '@/types/database';

interface VocabularyTopic {
  key: string;
  name: string;
  description: string;
  level: SpanishLevel;
}

interface VocabularyExerciseGeneratorProps {
  level: SpanishLevel;
  onExerciseGenerated?: (exercise: any) => void;
}

const VOCABULARY_TOPICS: Record<SpanishLevel, VocabularyTopic[]> = {
  A1: [
    { key: 'familia', name: 'Familie', description: 'Familiemedlemmer og relationer', level: 'A1' },
    { key: 'colores', name: 'Farver', description: 'Grundlæggende farver på spansk', level: 'A1' },
    { key: 'números', name: 'Tal 1-20', description: 'Tal fra 1 til 20 på spansk', level: 'A1' },
    { key: 'casa', name: 'Hus og møbler', description: 'Ting i hjemmet og møbler', level: 'A1' },
    { key: 'comida', name: 'Mad og drikke', description: 'Almindelig mad og drikkevarer', level: 'A1' },
    { key: 'ropa', name: 'Tøj', description: 'Tøj og tilbehør', level: 'A1' },
  ],
  A2: [
    { key: 'transporte', name: 'Transport og rejser', description: 'Transport, rejser og ferieord', level: 'A2' },
    { key: 'profesiones', name: 'Arbejde og professioner', description: 'Job, professioner og arbejdsplads', level: 'A2' },
    { key: 'cuerpo', name: 'Krop og sundhed', description: 'Kropsdele, sygdom og sundhed', level: 'A2' },
    { key: 'tiempo', name: 'Vejr og årstider', description: 'Vejr, årstider og klimabeskrivelse', level: 'A2' },
    { key: 'deportes', name: 'Sport og fritid', description: 'Sportsgrene og fritidsaktiviteter', level: 'A2' },
  ],
  B1: [
    { key: 'educación', name: 'Uddannelse', description: 'Uddannelsessystem, fag og akademiske udtryk', level: 'B1' },
    { key: 'política', name: 'Politik og samfund', description: 'Politik, samfund og sociale emner', level: 'B1' },
    { key: 'medioambiente', name: 'Miljø og natur', description: 'Miljø, klima og naturbeskyttelse', level: 'B1' },
    { key: 'tecnología', name: 'Teknologi', description: 'Teknologi, internet og digitale medier', level: 'B1' },
  ],
  B2: [],
  C1: [],
  C2: [],
};

export default function VocabularyExerciseGenerator({ level, onExerciseGenerated }: VocabularyExerciseGeneratorProps) {
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [exerciseType, setExerciseType] = useState<'multiple_choice' | 'fill_blank' | 'translation'>('multiple_choice');
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loading, setLoading] = useState(false);
  const [generatedExercise, setGeneratedExercise] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const topics = VOCABULARY_TOPICS[level] || [];

  const generateExercise = async () => {
    if (!selectedTopic) {
      setError('Vælg venligst et emne');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestBody = {
        topic: selectedTopic,
        level,
        exerciseType,
        questionCount,
        difficulty,
      };
      
      console.log('🚀 Sending vocabulary request:', requestBody);

      const response = await fetch('/api/generate-vocabulary-exercise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = 'Fejl ved generering af øvelse';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (e) {
          // If we can't parse the error response, use the default message
          errorMessage = `Server fejl (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const exercise = await response.json();
      setGeneratedExercise(exercise);
      
      // Automatically save to database after successful generation
      await saveExerciseToDatabase(exercise);
      
      if (onExerciseGenerated) {
        onExerciseGenerated(exercise);
      }
    } catch (err) {
      console.error('Error generating vocabulary exercise:', err);
      setError(err instanceof Error ? err.message : 'Ukendt fejl');
    } finally {
      setLoading(false);
    }
  };

  const saveExerciseToDatabase = async (exercise: any) => {
    if (!exercise) return;

    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const response = await fetch('/api/save-vocabulary-exercise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: selectedTopic,
          level: level,
          exercises: exercise.questions || [],
          exerciseType: exerciseType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fejl ved gemning af øvelse');
      }

      const result = await response.json();
      setSaveSuccess(true);
      console.log('✅ Exercise automatically saved to database:', result);
      
    } catch (err) {
      console.error('Error saving exercise:', err);
      setError(err instanceof Error ? err.message : 'Kunne ikke gemme øvelsen');
    } finally {
      setSaving(false);
    }
  };

  const resetGenerator = () => {
    setGeneratedExercise(null);
    setError(null);
    setSelectedTopic('');
    setSaveSuccess(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🗣️ Ordforråds Generator - Niveau {level}
        </h2>
        <p className="text-gray-600">
          Generer skræddersyede ordforrådsøvelser inden for forskellige emner
        </p>
      </div>

      {!generatedExercise ? (
        <div className="space-y-6">
          {/* Topic Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              📚 Vælg Ordforråds-emne:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {topics.map((topic) => (
                <button
                  key={topic.key}
                  onClick={() => setSelectedTopic(topic.key)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedTopic === topic.key
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{topic.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{topic.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Exercise Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              🎯 Øvelsestype:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => setExerciseType('multiple_choice')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  exerciseType === 'multiple_choice'
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">Multiple Choice</div>
                <div className="text-sm text-gray-600 mt-1">Vælg det rigtige svar</div>
              </button>
              <button
                onClick={() => setExerciseType('fill_blank')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  exerciseType === 'fill_blank'
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">Udfyld Blanke</div>
                <div className="text-sm text-gray-600 mt-1">Skriv det rigtige ord</div>
              </button>
              <button
                onClick={() => setExerciseType('translation')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  exerciseType === 'translation'
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">Oversættelse</div>
                <div className="text-sm text-gray-600 mt-1">Oversæt mellem dansk og spansk</div>
              </button>
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📊 Antal spørgsmål:
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={3}>3 spørgsmål</option>
                <option value={5}>5 spørgsmål</option>
                <option value={8}>8 spørgsmål</option>
                <option value={10}>10 spørgsmål</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ⚡ Sværhedsgrad:
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="easy">Let - Grundlæggende ord</option>
                <option value="medium">Medium - Ord i kontekst</option>
                <option value="hard">Svær - Komplekse anvendelser</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center">
            <button
              onClick={generateExercise}
              disabled={!selectedTopic || loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Genererer øvelse...
                </div>
              ) : (
                '🚀 Generer Ordforrådsøvelse'
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="text-red-400">❌</div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Fejl</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Generated Exercise Display */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-green-900">
                ✅ Øvelse Genereret og Gemt!
              </h3>
              <button
                onClick={resetGenerator}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Generer Ny Øvelse
              </button>
            </div>

            {saveSuccess && (
              <div className="bg-green-100 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <div className="text-green-500">✅</div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-green-800">Automatisk gemt!</h4>
                    <p className="text-sm text-green-700">Øvelsen er automatisk gemt og tilgængelig for brugere i dashboard.</p>
                  </div>
                </div>
              </div>
            )}

            {saving && (
              <div className="bg-blue-100 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <div className="ml-1">
                    <h4 className="text-sm font-medium text-blue-800">Gemmer...</h4>
                    <p className="text-sm text-blue-700">Gemmer øvelse til database...</p>
                  </div>
                </div>
              </div>
            )}

              <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Instruktioner:</h4>
                <p className="text-gray-700">{generatedExercise.instructions_da}</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">
                  Spørgsmål ({generatedExercise.questions?.length || 0}):
                </h4>
                <div className="space-y-3 mt-2">
                  {generatedExercise.questions?.map((question: any, index: number) => (
                    <div key={question.id} className="bg-white p-4 rounded-md border">
                      <div className="font-medium">
                        {index + 1}. {question.question_da}
                      </div>
                      {question.options && (
                        <div className="mt-2 text-sm">
                          <strong>Valgmuligheder:</strong> {question.options.join(', ')}
                        </div>
                      )}
                      <div className="mt-2 text-sm">
                        <strong>Korrekt svar:</strong> {question.correct_answer}
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <strong>Forklaring:</strong> {question.explanation_da}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {generatedExercise.vocabulary_metadata && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <h4 className="font-medium text-blue-900">Ordforråd brugt:</h4>
                  <div className="text-sm text-blue-700 mt-1">
                    {generatedExercise.vocabulary_metadata.words_used && 
                     Array.isArray(generatedExercise.vocabulary_metadata.words_used) ? 
                      generatedExercise.vocabulary_metadata.words_used.map((word: any) => 
                        `${word?.spanish || 'N/A'} = ${word?.danish || 'N/A'}`
                      ).join(', ') : 'Ingen ordforrådsdata tilgængelig'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}