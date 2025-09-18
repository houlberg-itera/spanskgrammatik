'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SpanishLevel } from '@/types/database';

interface Topic {
  id: string;
  name_da: string;
  description_da: string;
  level: SpanishLevel;
  exercise_count?: number;
}

interface GenerationJob {
  id: string;
  topicId: string;  // Add topicId to properly track the topic
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
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [exerciseTypes] = useState([
    { id: 'multiple_choice', name: 'Multiple Choice', weight: 35 },
    { id: 'fill_blank', name: 'Fill in the Blank', weight: 30 },
    { id: 'translation', name: 'Translation', weight: 20 },
    { id: 'conjugation', name: 'Verb Conjugation', weight: 10 },
    { id: 'sentence_structure', name: 'Sentence Structure', weight: 5 }
  ]);
  const [exercisesPerTopic, setExercisesPerTopic] = useState(100); // Increased from 25 to 100
  const [difficultyDistribution, setDifficultyDistribution] = useState({
    easy: 35,   // Slightly reduced from 40
    medium: 45, // Increased from 40  
    hard: 20    // Kept the same
  });
  const [generationJobs, setGenerationJobs] = useState<GenerationJob[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [currentModel, setCurrentModel] = useState<string>('gpt-4o');

  // Preset configurations for comprehensive exercise generation
  const presets = {
    comprehensive: {
      name: '🎯 Omfattende (100 øvelser)',
      exercisesPerTopic: 100,
      difficultyDistribution: { easy: 35, medium: 45, hard: 20 },
      exerciseTypes: [
        { id: 'multiple_choice', name: 'Multiple Choice', weight: 35 },
        { id: 'fill_blank', name: 'Fill in the Blank', weight: 30 },
        { id: 'translation', name: 'Translation', weight: 20 },
        { id: 'conjugation', name: 'Verb Conjugation', weight: 10 },
        { id: 'sentence_structure', name: 'Sentence Structure', weight: 5 }
      ]
    },
    intensive: {
      name: '🚀 Intensiv (150 øvelser)',
      exercisesPerTopic: 150,
      difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
      exerciseTypes: [
        { id: 'multiple_choice', name: 'Multiple Choice', weight: 40 },
        { id: 'fill_blank', name: 'Fill in the Blank', weight: 25 },
        { id: 'translation', name: 'Translation', weight: 20 },
        { id: 'conjugation', name: 'Verb Conjugation', weight: 10 },
        { id: 'sentence_structure', name: 'Sentence Structure', weight: 5 }
      ]
    },
    production: {
      name: '💎 Produktion (200 øvelser)',
      exercisesPerTopic: 200,
      difficultyDistribution: { easy: 25, medium: 55, hard: 20 },
      exerciseTypes: [
        { id: 'multiple_choice', name: 'Multiple Choice', weight: 30 },
        { id: 'fill_blank', name: 'Fill in the Blank', weight: 25 },
        { id: 'translation', name: 'Translation', weight: 25 },
        { id: 'conjugation', name: 'Verb Conjugation', weight: 15 },
        { id: 'sentence_structure', name: 'Sentence Structure', weight: 5 }
      ]
    },
    testing: {
      name: '🧪 Test (50 øvelser)',
      exercisesPerTopic: 50,
      difficultyDistribution: { easy: 40, medium: 40, hard: 20 },
      exerciseTypes: [
        { id: 'multiple_choice', name: 'Multiple Choice', weight: 40 },
        { id: 'fill_blank', name: 'Fill in the Blank', weight: 30 },
        { id: 'translation', name: 'Translation', weight: 20 },
        { id: 'conjugation', name: 'Verb Conjugation', weight: 10 },
        { id: 'sentence_structure', name: 'Sentence Structure', weight: 15 }
      ]
    }
  };

  const supabase = createClient();

  useEffect(() => {
    loadTopics();
    loadAIConfiguration();
  }, [selectedLevel]);

  const loadTopics = async () => {
    try {
      console.log('Loading topics for level:', selectedLevel);
      const response = await fetch(`/api/admin/topics?level=${selectedLevel}`);
      if (!response.ok) {
        console.error('Failed to fetch topics:', response.status, response.statusText);
        setTopics([]);
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

  const loadAIConfiguration = async () => {
    try {
      console.log('Loading AI configuration...');
      const response = await fetch('/api/ai-config/configurations');
      
      if (response.ok) {
        const data = await response.json();
        const activeConfig = data.data?.find((config: any) => config.is_active);
        if (activeConfig) {
          setCurrentModel(activeConfig.model_name || 'gpt-4o');
          console.log('Loaded AI model:', activeConfig.model_name);
        }
      } else {
        console.log('No AI configuration found, using default model');
      }
    } catch (error) {
      console.error('Error loading AI configuration:', error);
    }
  };

  const applyPreset = (presetKey: keyof typeof presets) => {
    const preset = presets[presetKey];
    setExercisesPerTopic(preset.exercisesPerTopic);
    setDifficultyDistribution(preset.difficultyDistribution);
    console.log(`Applied preset: ${preset.name}`);
  };

  const clearExerciseDatabase = async () => {
    if (!confirm('⚠️ ADVARSEL: Dette vil slette ALLE øvelser i databasen permanent. Er du sikker?')) {
      return;
    }

    if (!confirm('💥 SIDSTE CHANCE: Alle øvelser vil blive slettet og kan ikke gendannes. Fortsæt?')) {
      return;
    }

    try {
      setIsGenerating(true);
      console.log('🗑️ Clearing exercise database...');
      
      const response = await fetch('/api/admin/clear-exercises', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to clear database');
      }

      const result = await response.json();
      console.log('✅ Database cleared successfully:', result);
      alert(`✅ Databasen er ryddet! Slettede ${result.deletedCount} øvelser.`);
      
      // Reload topics to update exercise counts
      await loadTopics();
    } catch (error) {
      console.error('❌ Error clearing database:', error);
      alert('❌ Fejl ved rydning af database. Tjek konsollen for detaljer.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTopicSelection = (topicId: string) => {
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

  const generateExercisesForTopic = async (topic: Topic, exerciseType: string, count: number, difficultyDist?: typeof difficultyDistribution, retryCount = 0) => {
    // Check if generation should stop before making API call
    if (shouldStop) {
      console.log('🛑 API call cancelled - generation stopped by user');
      throw new Error('Generation stopped by user');
    }
    
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds base delay
    // Create or reuse AbortController for this request
    if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
      abortControllerRef.current = new AbortController();
    }
    const signal = abortControllerRef.current.signal;
    try {
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
        }),
        signal,
      });

      if (!response.ok) {
        // Check if it's a rate limit error (429)
        if (response.status === 429 && retryCount < maxRetries && !shouldStop) {
          const exponentialDelay = baseDelay * Math.pow(2, retryCount); // 2s, 4s, 8s
          console.log(`Rate limit hit for ${topic.name_da} - ${exerciseType}. Retrying in ${exponentialDelay/1000}s (attempt ${retryCount + 1}/${maxRetries + 1})`);
          
          // Wait with exponential backoff, but check for stop during wait
          const startTime = Date.now();
          while (Date.now() - startTime < exponentialDelay) {
            if (shouldStop) {
              console.log('🛑 Retry cancelled - generation stopped by user');
              throw new Error('Generation stopped by user');
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Retry the request
          return await generateExercisesForTopic(topic, exerciseType, count, difficultyDist, retryCount + 1);
        }
        
        throw new Error(`Failed to generate exercises: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      // Check if user stopped generation
      if (shouldStop) {
        console.log('🛑 Generation stopped by user during API call');
        throw new Error('Generation stopped by user');
      }
      
      // If we've exhausted retries or it's not a network error, throw
      if (retryCount >= maxRetries || !error.message?.includes('Failed to fetch')) {
        throw error;
      }
      
      // Retry on network errors too, but check for stop during delay
      const exponentialDelay = baseDelay * Math.pow(2, retryCount);
      console.log(`Network error for ${topic.name_da} - ${exerciseType}. Retrying in ${exponentialDelay/1000}s (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      // Wait with stop checks during network retry delay
      const startTime = Date.now();
      while (Date.now() - startTime < exponentialDelay) {
        if (shouldStop) {
          console.log('🛑 Network retry cancelled - generation stopped by user');
          throw new Error('Generation stopped by user');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return await generateExercisesForTopic(topic, exerciseType, count, difficultyDist, retryCount + 1);
    }
  };

  const startBulkGeneration = async () => {
    if (selectedTopics.length === 0) {
      alert('Vælg venligst mindst ét emne');
      return;
    }

    // Reset control states
    setShouldStop(false);
    setIsPaused(false);
    setCurrentJobIndex(0);

    // Immediate feedback - set loading state first
    setIsGenerating(true);
    
    // Small delay to ensure UI updates immediately
    await new Promise(resolve => setTimeout(resolve, 50));

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

    console.log(`🚀 Starting bulk generation with ${jobs.length} jobs. Using progressive delays to avoid rate limits.`);

    // Process jobs sequentially to avoid rate limits
    for (let i = 0; i < jobs.length; i++) {
      // Check if we should stop
      if (shouldStop) {
        console.log('🛑 Generation stopped by user');
        setIsGenerating(false);
        return;
      }

      // Wait while paused
      while (isPaused && !shouldStop) {
        console.log('⏸️ Generation paused, waiting...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Check again after pause
      if (shouldStop) {
        console.log('🛑 Generation stopped by user after pause');
        setIsGenerating(false);
        return;
      }

      setCurrentJobIndex(i);
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

      console.log(`📝 Processing job ${i+1}/${jobs.length}: ${topic.name_da} - ${job.exerciseType} (${job.requestedCount} exercises)`);

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

        console.log(`✅ Job ${i+1}/${jobs.length} completed: ${generatedCount} exercises generated`);

        // Add progressive delay to respect rate limits (longer delays as we progress)
        if (i < jobs.length - 1) {
          const progressiveDelay = Math.min(1000 + (i * 200), 5000); // Start at 1s, increase by 200ms per job, max 5s
          console.log(`⏳ Waiting ${progressiveDelay/1000}s before next generation (job ${i+1}/${jobs.length})`);
          
          // Break delay into smaller chunks so we can respond to pause/stop faster
          const chunkSize = 250;
          const chunks = Math.ceil(progressiveDelay / chunkSize);
          for (let chunk = 0; chunk < chunks; chunk++) {
            if (shouldStop) return;
            if (isPaused) {
              while (isPaused && !shouldStop) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
              if (shouldStop) return;
            }
            await new Promise(resolve => setTimeout(resolve, chunkSize));
          }
        }

      } catch (error) {
        console.error(`Error generating exercises for job ${job.id}:`, error);
        
        // Check if error is due to user stopping generation
        if (error instanceof Error && error.message.includes('Generation stopped by user')) {
          console.log('🛑 Job cancelled due to user stop request');
          setGenerationJobs(prev => prev.map(j => 
            j.id === job.id ? { 
              ...j, 
              status: 'error',
              errorMessage: 'Stopped by user'
            } : j
          ));
          // Exit the loop completely when user stops
          setIsGenerating(false);
          return;
        }
        
        // Check if it's a rate limit error to provide better messaging
        const isRateLimit = error instanceof Error && 
          (error.message.includes('Too Many Requests') || 
           error.message.includes('rate limit') ||
           error.message.includes('429'));
           
        const errorMessage = isRateLimit 
          ? 'Rate limit reached - AI service busy. Retries were attempted but failed.' 
          : (error instanceof Error ? error.message : 'Unknown error');
          
        setGenerationJobs(prev => prev.map(j => 
          j.id === job.id ? { 
            ...j, 
            status: 'error',
            errorMessage: errorMessage
          } : j
        ));
        
        // Continue with other jobs even if one fails, but add extra delay for rate limit errors
        if (isRateLimit && i < jobs.length - 1) {
          console.log(`⚠️ Rate limit error - adding extra 10s delay before continuing`);
          await new Promise(resolve => setTimeout(resolve, 10000)); // Extra 10s delay for rate limits
        }
        
        console.log(`Continuing with remaining jobs after error in job ${job.id}`);
      }
    }

    // Always set isGenerating to false when done
    setIsGenerating(false);
    await loadTopics(); // Refresh topic counts
  };

  const pauseGeneration = () => {
    setIsPaused(true);
    console.log('⏸️ Generation paused by user');
  };

  const resumeGeneration = () => {
    setIsPaused(false);
    console.log('▶️ Generation resumed by user');
  };

  const stopGeneration = () => {
    setShouldStop(true);
    setIsPaused(false);
    setIsGenerating(false);
    setCurrentJobIndex(0);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Clear and reset generation jobs
    setGenerationJobs([]);
    
    // Reset all job states to provide clean slate
    setGenerationJobs(prev => prev.map(job => ({
      ...job,
      status: job.status === 'generating' ? 'error' : job.status,
      error: job.status === 'generating' ? 'Stopped by user' : job.error
    })));
    
    console.log('🛑 Complete generation stop - all processes halted by user');
    alert('Generation stopped. All pending exercises cancelled.');
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
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              🤖 AI Øvelse Generator - Admin Panel
            </h1>
            
            {/* Current Model Display and Config Link */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Nuværende AI Model</div>
                <div className="font-semibold text-gray-900">{currentModel}</div>
              </div>
              
              {/* Quick Model Switcher */}
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Hurtig Model Skift</label>
                <select
                  value={currentModel}
                  onChange={async (e) => {
                    const newModel = e.target.value;
                    setCurrentModel(newModel);
                    
                    // Update the active AI configuration
                    try {
                      const response = await fetch('/api/ai-config/configurations', {
                        method: 'GET'
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        const activeConfig = data.data?.find((config: any) => config.is_active);
                        
                        if (activeConfig) {
                          // Update the existing active configuration
                          const updateResponse = await fetch(`/api/ai-config/configurations/${activeConfig.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              ...activeConfig,
                              model_name: newModel
                            })
                          });
                          
                          if (updateResponse.ok) {
                            console.log(`✅ Model updated to: ${newModel}`);
                          } else {
                            console.error('❌ Failed to update model');
                          }
                        }
                      }
                    } catch (error) {
                      console.error('❌ Error updating model:', error);
                    }
                  }}
                  className="text-sm px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-5">GPT-5</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                </select>
              </div>
              
              <a
                href="/admin/ai-config"
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
              >
                ⚙️ Konfigurer AI
              </a>
            </div>
          </div>

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

          {/* Preset Configurations */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              📋 Forudindstillede Konfigurationer
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(presets).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key as keyof typeof presets)}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left"
                >
                  <div className="font-medium text-gray-900 mb-1">{preset.name}</div>
                  <div className="text-sm text-gray-600">
                    {preset.exercisesPerTopic} øvelser per emne
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Let: {preset.difficultyDistribution.easy}% | 
                    Mellem: {preset.difficultyDistribution.medium}% | 
                    Svær: {preset.difficultyDistribution.hard}%
                  </div>
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              💡 Klik på en forudindstilling for at anvende den automatisk
            </p>
          </div>

          {/* Quick All-Levels Generation */}
          <div className="mb-8 border-2 border-green-200 rounded-lg bg-green-50 p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4">
              🎯 Hurtig Total Regenerering
            </h3>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">🚀 Generer for ALLE niveauer</h4>
                <p className="text-sm text-green-700 mb-3">
                  Anvender "Omfattende" forudindstilling (100 øvelser per emne) for A1, A2 og B1 niveauer automatisk.
                  Dette vil generere ~1200-1500 øvelser i alt.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      if (!confirm('🎯 Dette vil anvende Omfattende forudindstilling og forberede total regenerering. Fortsæt?')) return;
                      applyPreset('comprehensive');
                      alert('✅ Omfattende forudindstilling anvendt! Vælg nu niveauer og emner manuelt for at generere.');
                    }}
                    disabled={isGenerating}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      isGenerating
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    🎯 Anvend Omfattende Preset
                  </button>
                  
                  <button
                    onClick={() => {
                      applyPreset('production');
                      alert('💎 Produktions forudindstilling anvendt! 200 øvelser per emne for maksimal dækning.');
                    }}
                    disabled={isGenerating}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      isGenerating
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    💎 Anvend Produktions Preset
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Exercise Configuration */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Øvelser per emne
              </label>
              <input
                type="number"
                min="10"
                max="500"
                value={exercisesPerTopic}
                onChange={(e) => setExercisesPerTopic(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Anbefalet: 100-200 øvelser for omfattende dækning og proficienstestning
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
                📊 Omfattende Genereringssammendrag
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
                  <div className="text-2xl font-bold text-blue-600">~{Math.ceil(calculateTotalExercises() * 3 / 60)}</div>
                  <div className="text-sm text-blue-700">Minutter (AI Gen)</div>
                </div>
              </div>
              
              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">📈 Sværhedsgrad Fordeling:</h4>
                  <div className="space-y-1">
                    <div>Let: <span className="font-medium">{Math.round(calculateTotalExercises() * difficultyDistribution.easy / 100)}</span> øvelser ({difficultyDistribution.easy}%)</div>
                    <div>Mellem: <span className="font-medium">{Math.round(calculateTotalExercises() * difficultyDistribution.medium / 100)}</span> øvelser ({difficultyDistribution.medium}%)</div>
                    <div>Svær: <span className="font-medium">{Math.round(calculateTotalExercises() * difficultyDistribution.hard / 100)}</span> øvelser ({difficultyDistribution.hard}%)</div>
                  </div>
                </div>
                
                <div className="bg-green-100 p-3 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">🎯 Øvelsestype Fordeling:</h4>
                  <div className="space-y-1">
                    {exerciseTypes.map(type => (
                      <div key={type.id}>
                        {type.name}: <span className="font-medium">{Math.round(exercisesPerTopic * type.weight / 100)}</span> per emne ({type.weight}%)
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>⚡ AI Model:</strong> {currentModel.toUpperCase()} | 
                  <strong> 📚 Proficienstestning:</strong> Med {exercisesPerTopic} øvelser per emne får eleverne tilstrækkelig variation til præcis vurdering | 
                  <strong> 🎮 Engagement:</strong> Blandet sværhedsgrad holder elever motiverede gennem hele læreprocessen
                </p>
              </div>
            </div>
          )}

          {/* Danger Zone - Database Management */}
          <div className="mb-8 border-2 border-red-200 rounded-lg bg-red-50 p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-4">
              ⚠️ Farezone - Database Styring
            </h3>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-800 mb-2">🗑️ Ryd Øvelses Database</h4>
                <p className="text-sm text-red-700 mb-3">
                  Slet alle eksisterende øvelser for at forberede komplet regenerering med nye parametre.
                  <strong> Denne handling kan ikke fortrydes!</strong>
                </p>
                <button
                  onClick={clearExerciseDatabase}
                  disabled={isGenerating}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isGenerating
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700 hover:scale-105'
                  }`}
                >
                  {isGenerating ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                      <span>Behandler...</span>
                    </div>
                  ) : (
                    '💥 Ryd Database'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Generation Control Panel */}
          <div className="mb-8">
            {!isGenerating ? (
              <button
                onClick={startBulkGeneration}
                disabled={selectedTopics.length === 0}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 ${
                  selectedTopics.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                }`}
              >
                🚀 Start AI Generering
              </button>
            ) : (
              <div className="space-y-4">
                {/* Generation Status */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-blue-700 font-medium">
                        {isPaused ? '⏸️ Pauseret' : '🤖 Genererer øvelser...'}
                      </span>
                      <span className="text-blue-600">
                        Job {currentJobIndex + 1} af {generationJobs.length}
                      </span>
                    </div>
                    <div className="text-sm text-blue-600">
                      {Math.round(((currentJobIndex) / generationJobs.length) * 100)}% færdig
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3 bg-blue-100 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentJobIndex) / generationJobs.length) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex space-x-3">
                  {!isPaused ? (
                    <button
                      onClick={pauseGeneration}
                      className="flex-1 py-3 px-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                    >
                      ⏸️ Pause Generering
                    </button>
                  ) : (
                    <button
                      onClick={resumeGeneration}
                      className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      ▶️ Fortsæt Generering
                    </button>
                  )}
                  
                  <button
                    onClick={stopGeneration}
                    className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    🛑 Stop Generering
                  </button>
                </div>
              </div>
            )}
            
            {/* Immediate feedback message for non-generating state */}
            {!isGenerating && selectedTopics.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-700">
                  <div className="animate-pulse">⚡</div>
                  <span className="text-sm font-medium">
                    AI generering er startet! Følg fremskridt nedenfor...
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Generation Progress */}
          {generationJobs.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  📊 Genererings Status
                </h3>
                <div className="text-sm text-gray-600">
                  {generationJobs.filter(j => j.status === 'completed').length} / {generationJobs.length} færdig
                </div>
              </div>
              
              {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${generationJobs.length === 0 ? 0 : (generationJobs.filter(j => j.status === 'completed').length / generationJobs.length) * 100}%` 
                    }}
                  ></div>
                </div>
              
              <div className="space-y-2">
                {generationJobs.map(job => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-white rounded border shadow-sm">
                    <div className="flex-1">
                      <div className="font-medium">{job.topic} - {job.exerciseType}</div>
                      <div className={getJobStatusColor(job.status)}>
                        Status: {job.status}
                        {job.status === 'completed' && (
                          <span className="ml-2 text-green-600">✔️</span>
                        )}
                        {job.status === 'generating' && (
                          <span className="ml-2 text-blue-600">⏳</span>
                        )}
                        {job.status === 'error' && (
                          <span className="ml-2 text-red-600">❌</span>
                        )}
                      </div>
                      {job.status === 'error' && job.errorMessage && (
                        <div className="text-xs text-red-500 mt-1">{job.errorMessage}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-600">{job.generatedCount} / {job.requestedCount}</span>
                    </div>
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

