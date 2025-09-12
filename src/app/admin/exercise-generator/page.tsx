'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SpanishLevel } from '@/types/database';

interface Topic {
  id: number;
  name_da: string;
  description_da: string;
  level: SpanishLevel;
  exercise_count?: number;
}

interface GenerationJob {
  id: string;
  topicId: number;  // Changed from string to number to match database
  topic: string;
  level: SpanishLevel;
  exerciseType: string;
  requestedCount: number;
  generatedCount: number;
  status: 'pending' | 'generating' | 'completed' | 'error';
  errorMessage?: string;
}

export default function ExerciseGeneratorAdmin() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<SpanishLevel>('A1');
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [exerciseTypes] = useState([
    { id: 'multiple_choice', name: 'Multiple Choice', weight: 30 },
    { id: 'fill_blank', name: 'Fill in the Blank', weight: 25 },
    { id: 'translation', name: 'Translation', weight: 20 },
    { id: 'conjugation', name: 'Verb Conjugation', weight: 15 },
    { id: 'sentence_structure', name: 'Sentence Structure', weight: 10 }
  ]);
  const [exercisesPerTopic, setExercisesPerTopic] = useState(25);
  const [difficultyDistribution, setDifficultyDistribution] = useState({
    easy: 40,
    medium: 40,
    hard: 20
  });
  const [generationJobs, setGenerationJobs] = useState<GenerationJob[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadTopics();
  }, [selectedLevel]);

  const loadTopics = async () => {
    try {
      console.log('Loading topics for level:', selectedLevel);
      const response = await fetch(`/api/admin/topics?level=${selectedLevel}`);
      
      if (!response.ok) {
        console.error('Failed to fetch topics:', response.status, response.statusText);
        return;
      }
      
      const { topics } = await response.json();
      console.log('Loaded topics:', topics?.length || 0);
      setTopics(topics || []);
    } catch (error) {
      console.error('Error loading topics:', error);
      setTopics([]);
    }
  };

  const handleTopicSelection = (topicId: number) => {
    setSelectedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const selectAllTopics = () => {
    setSelectedTopics(topics.map(t => t.id));
  };

  const clearSelection = () => {
    setSelectedTopics([]);
  };

  const calculateTotalExercises = () => {
    return selectedTopics.length * exercisesPerTopic;
  };

  const generateExercisesForTopic = async (topic: Topic, exerciseType: string, count: number, difficultyDist?: typeof difficultyDistribution) => {
    const response = await fetch('/api/generate-bulk-exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topicId: topic.id,
        exerciseType,
        count,
        difficultyDistribution: difficultyDist || difficultyDistribution,
        level: topic.level,
        topicName: topic.name_da,
        topicDescription: topic.description_da
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to generate exercises: ${response.statusText}`);
    }

    return await response.json();
  };

  const startBulkGeneration = async () => {
    if (selectedTopics.length === 0) {
      alert('Vælg venligst mindst ét emne');
      return;
    }

    setIsGenerating(true);
    const jobs: GenerationJob[] = [];

    // Create jobs for each topic and exercise type
    for (const topicId of selectedTopics) {
      const topic = topics.find(t => t.id === topicId)!;
      
      for (const exerciseType of exerciseTypes) {
        const count = Math.ceil((exercisesPerTopic * exerciseType.weight) / 100);
        if (count > 0) {
          jobs.push({
            id: `${topicId}-${exerciseType.id}`,
            topicId: topicId,  // Store the actual topic ID
            topic: topic.name_da,
            level: topic.level,
            exerciseType: exerciseType.name,
            requestedCount: count,
            generatedCount: 0,
            status: 'pending'
          });
        }
      }
    }

    setGenerationJobs(jobs);

    // Process jobs sequentially to avoid rate limits
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const topic = topics.find(t => t.id === job.topicId);  // Use topicId instead of name_da
      
      if (!topic) {
        console.error(`Topic not found for job ${job.id} with topicId ${job.topicId}`);
        setGenerationJobs(prev => prev.map(j => 
          j.id === job.id ? { 
            ...j, 
            status: 'error',
            errorMessage: `Topic not found: ${job.topicId}`
          } : j
        ));
        continue;
      }
      
      // Update job status
      setGenerationJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'generating' } : j
      ));

      try {
        // Generate all exercises for this topic and exercise type in a single API call
        const result = await generateExercisesForTopic(
          topic, 
          exerciseTypes.find(et => et.name === job.exerciseType)?.id || 'multiple_choice',
          job.requestedCount,
          difficultyDistribution  // Pass difficulty distribution to the API
        );

        const generatedCount = result.exercisesCreated || job.requestedCount;

        // Update job as completed
        setGenerationJobs(prev => prev.map(j => 
          j.id === job.id ? { 
            ...j, 
            status: 'completed', 
            generatedCount 
          } : j
        ));

        // Add delay to respect rate limits (reduced from 2000ms to 500ms for GPT-5 high limits)
        if (i < jobs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`Error generating exercises for job ${job.id}:`, error);
        setGenerationJobs(prev => prev.map(j => 
          j.id === job.id ? { 
            ...j, 
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          } : j
        ));
      }
    }

    setIsGenerating(false);
    await loadTopics(); // Refresh topic counts
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'generating': return 'text-blue-500';
      case 'completed': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🤖 AI Øvelse Generator - Admin Panel
          </h1>

          {/* Level Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Vælg Niveau
            </label>
            <div className="flex space-x-4">
              {(['A1', 'A2', 'B1'] as SpanishLevel[]).map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedLevel === level
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Niveau {level}
                </button>
              ))}
            </div>
          </div>

          {/* Exercise Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Øvelser per Emne
              </label>
              <input
                type="number"
                min="10"
                max="50"
                value={exercisesPerTopic}
                onChange={(e) => setExercisesPerTopic(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Anbefalet: 20-30 øvelser for tilstrækkelig proficienstestning
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Sværhedsgrad Fordeling
              </label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Let ({difficultyDistribution.easy}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={difficultyDistribution.easy}
                    onChange={(e) => setDifficultyDistribution(prev => ({
                      ...prev,
                      easy: parseInt(e.target.value)
                    }))}
                    className="w-32"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Medium ({difficultyDistribution.medium}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={difficultyDistribution.medium}
                    onChange={(e) => setDifficultyDistribution(prev => ({
                      ...prev,
                      medium: parseInt(e.target.value)
                    }))}
                    className="w-32"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Svær ({difficultyDistribution.hard}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={difficultyDistribution.hard}
                    onChange={(e) => setDifficultyDistribution(prev => ({
                      ...prev,
                      hard: parseInt(e.target.value)
                    }))}
                    className="w-32"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Topic Selection */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Vælg Emner (Niveau {selectedLevel})
              </h2>
              <div className="space-x-2">
                <button
                  onClick={selectAllTopics}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Vælg Alle
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Ryd Valg
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics.map(topic => (
                <div
                  key={topic.id}
                  onClick={() => handleTopicSelection(topic.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTopics.includes(topic.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{topic.name_da}</h3>
                      <p className="text-sm text-gray-600 mt-1">{topic.description_da}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Nuværende øvelser: {topic.exercise_count || 0}
                      </p>
                    </div>
                    <div className="ml-2">
                      <div className={`w-4 h-4 rounded border-2 ${
                        selectedTopics.includes(topic.id)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedTopics.includes(topic.id) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generation Summary */}
          {selectedTopics.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                Genereringssammendrag
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedTopics.length}</div>
                  <div className="text-sm text-blue-700">Emner</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{calculateTotalExercises()}</div>
                  <div className="text-sm text-blue-700">Total Øvelser</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{exerciseTypes.length}</div>
                  <div className="text-sm text-blue-700">Øvelsestyper</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">~{Math.ceil(calculateTotalExercises() * 2 / 60)}</div>
                  <div className="text-sm text-blue-700">Minutter (Estimat)</div>
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="mb-8">
            <button
              onClick={startBulkGeneration}
              disabled={isGenerating || selectedTopics.length === 0}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
                isGenerating || selectedTopics.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isGenerating ? '🤖 Genererer øvelser...' : '🚀 Start AI Generering'}
            </button>
          </div>

          {/* Generation Progress */}
          {generationJobs.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Genererings Status
              </h3>
              <div className="space-y-2">
                {generationJobs.map(job => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="flex-1">
                      <div className="font-medium">{job.topic} - {job.exerciseType}</div>
                      <div className="text-sm text-gray-600">
                        {job.generatedCount}/{job.requestedCount} øvelser
                      </div>
                    </div>
                    <div className={`font-medium ${getJobStatusColor(job.status)}`}>
                      {job.status === 'pending' && '⏳ Venter'}
                      {job.status === 'generating' && '🤖 Genererer'}
                      {job.status === 'completed' && '✅ Færdig'}
                      {job.status === 'error' && '❌ Fejl'}
                    </div>
                    {job.status === 'error' && job.errorMessage && (
                      <div className="text-xs text-red-600 mt-1">{job.errorMessage}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
