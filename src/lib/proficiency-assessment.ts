import { createClient } from '@/lib/supabase/server';
import { SpanishLevel } from '@/types/database';

export interface ProficiencyAnalysis {
  currentLevel: SpanishLevel;
  confidenceScore: number; // 0-100
  strengthAreas: string[];
  weaknessAreas: string[];
  recommendedLevel: SpanishLevel;
  progressToNextLevel: number; // 0-100
  exercisesNeeded: number;
  detailedAnalysis: {
    topicScores: Record<string, number>;
    skillDistribution: Record<string, number>;
    difficultyProgression: boolean;
    consistencyScore: number;
  };
}

export interface ExercisePerformance {
  exerciseId: number;
  topicName: string;
  difficulty: string;
  score: number;
  exerciseType: string;
  completedAt: string;
  questionsCorrect: number;
  totalQuestions: number;
  timeSpent?: number;
}

const LEVEL_REQUIREMENTS = {
  A1: {
    minScore: 70,
    requiredTopics: ['ser_estar', 'present_tense', 'articles', 'basic_vocabulary'],
    exercisesPerTopic: 15,
    skillThresholds: {
      grammar: 70,
      vocabulary: 75,
      conjugation: 65,
      comprehension: 70
    }
  },
  A2: {
    minScore: 75,
    requiredTopics: ['past_tense', 'future_tense', 'irregular_verbs', 'comparatives'],
    exercisesPerTopic: 20,
    skillThresholds: {
      grammar: 75,
      vocabulary: 80,
      conjugation: 75,
      comprehension: 75
    }
  },
  B1: {
    minScore: 80,
    requiredTopics: ['subjunctive', 'conditional', 'complex_sentences', 'advanced_vocabulary'],
    exercisesPerTopic: 25,
    skillThresholds: {
      grammar: 80,
      vocabulary: 85,
      conjugation: 80,
      comprehension: 80
    }
  }
};

const DIFFICULTY_WEIGHTS = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0
};

export async function analyzeProficiency(userId: string): Promise<ProficiencyAnalysis> {
  const supabase = await createClient();

  // Get user's exercise performance
  const { data: performances, error } = await supabase
    .from('user_progress')
    .select(`
      exercise_id,
      score,
      completed_at,
      exercises!inner(
        title_da,
        type,
        difficulty_level,
        content,
        topics!inner(
          name_da,
          level
        )
      )
    `)
    .eq('user_id', userId)
    .eq('completed', true)
    .order('completed_at', { ascending: false })
    .limit(100);

  if (error || !performances || performances.length === 0) {
    // Return default analysis for new users
    return {
      currentLevel: 'A1',
      confidenceScore: 0,
      strengthAreas: [],
      weaknessAreas: ['Insufficient data'],
      recommendedLevel: 'A1',
      progressToNextLevel: 0,
      exercisesNeeded: 50,
      detailedAnalysis: {
        topicScores: {},
        skillDistribution: {},
        difficultyProgression: false,
        consistencyScore: 0
      }
    };
  }

  // Process performance data
  const exercisePerformances: ExercisePerformance[] = performances.map(p => {
    const exercise = Array.isArray(p.exercises) ? p.exercises[0] : p.exercises;
    const topic = Array.isArray(exercise?.topics) ? exercise.topics[0] : exercise?.topics;
    
    return {
      exerciseId: p.exercise_id,
      topicName: topic?.name_da || 'Unknown Topic',
      difficulty: (exercise as any)?.difficulty_level || 'medium',
      score: p.score || 0,
      exerciseType: (exercise as any)?.type || 'grammar',
      completedAt: p.completed_at || '',
      questionsCorrect: Math.round((p.score || 0) * ((exercise as any)?.content?.questions?.length || 5) / 100),
      totalQuestions: (exercise as any)?.content?.questions?.length || 5
    };
  });

  // Calculate topic scores with difficulty weighting
  const topicScores: Record<string, number[]> = {};
  const skillScores: Record<string, number[]> = {};

  exercisePerformances.forEach(perf => {
    const weight = DIFFICULTY_WEIGHTS[perf.difficulty as keyof typeof DIFFICULTY_WEIGHTS] || 1.0;
    const weightedScore = perf.score * weight;

    // Group by topic
    if (!topicScores[perf.topicName]) {
      topicScores[perf.topicName] = [];
    }
    topicScores[perf.topicName].push(weightedScore);

    // Group by skill/exercise type
    if (!skillScores[perf.exerciseType]) {
      skillScores[perf.exerciseType] = [];
    }
    skillScores[perf.exerciseType].push(weightedScore);
  });

  // Calculate average scores
  const avgTopicScores: Record<string, number> = {};
  Object.keys(topicScores).forEach(topic => {
    avgTopicScores[topic] = topicScores[topic].reduce((sum, score) => sum + score, 0) / topicScores[topic].length;
  });

  const avgSkillScores: Record<string, number> = {};
  Object.keys(skillScores).forEach(skill => {
    avgSkillScores[skill] = skillScores[skill].reduce((sum, score) => sum + score, 0) / skillScores[skill].length;
  });

  // Determine current proficiency level
  const overallAverage = exercisePerformances.reduce((sum, perf) => sum + perf.score, 0) / exercisePerformances.length;
  
  let currentLevel: SpanishLevel = 'A1';
  let confidenceScore = 0;

  // Analyze level progression
  const recentPerformances = exercisePerformances.slice(0, 20); // Last 20 exercises
  const recentAverage = recentPerformances.reduce((sum, perf) => sum + perf.score, 0) / recentPerformances.length;

  // Check A2 readiness
  if (recentAverage >= LEVEL_REQUIREMENTS.A1.minScore && 
      checkTopicCoverage(avgTopicScores, LEVEL_REQUIREMENTS.A1.requiredTopics, 70)) {
    currentLevel = 'A2';
    confidenceScore = Math.min(95, recentAverage);
  }

  // Check B1 readiness
  if (recentAverage >= LEVEL_REQUIREMENTS.A2.minScore && 
      checkTopicCoverage(avgTopicScores, LEVEL_REQUIREMENTS.A2.requiredTopics, 75)) {
    currentLevel = 'B1';
    confidenceScore = Math.min(95, recentAverage);
  }

  // Identify strengths and weaknesses
  const strengthAreas: string[] = [];
  const weaknessAreas: string[] = [];

  Object.entries(avgTopicScores).forEach(([topic, score]) => {
    if (score >= 85) {
      strengthAreas.push(topic);
    } else if (score < 65) {
      weaknessAreas.push(topic);
    }
  });

  // Calculate consistency score
  const scoreVariance = calculateVariance(exercisePerformances.map(p => p.score));
  const consistencyScore = Math.max(0, 100 - scoreVariance);

  // Check difficulty progression
  const difficultyProgression = checkDifficultyProgression(exercisePerformances);

  // Calculate progress to next level
  const nextLevel = getNextLevel(currentLevel);
  const progressToNextLevel = calculateProgressToNextLevel(currentLevel, nextLevel, avgTopicScores, avgSkillScores);

  // Estimate exercises needed
  const exercisesNeeded = calculateExercisesNeeded(currentLevel, avgTopicScores, weaknessAreas);

  return {
    currentLevel,
    confidenceScore,
    strengthAreas,
    weaknessAreas,
    recommendedLevel: progressToNextLevel > 80 ? nextLevel : currentLevel,
    progressToNextLevel,
    exercisesNeeded,
    detailedAnalysis: {
      topicScores: avgTopicScores,
      skillDistribution: avgSkillScores,
      difficultyProgression,
      consistencyScore
    }
  };
}

function checkTopicCoverage(topicScores: Record<string, number>, requiredTopics: string[], minScore: number): boolean {
  return requiredTopics.every(topic => {
    const score = topicScores[topic];
    return score !== undefined && score >= minScore;
  });
}

function calculateVariance(scores: number[]): number {
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
}

function checkDifficultyProgression(performances: ExercisePerformance[]): boolean {
  // Check if user has successfully completed exercises of increasing difficulty
  const difficulties = ['easy', 'medium', 'hard'];
  const difficultyProgress = difficulties.map(diff => {
    const diffPerfs = performances.filter(p => p.difficulty === diff);
    return diffPerfs.length > 0 && diffPerfs.some(p => p.score >= 70);
  });

  return difficultyProgress.filter(Boolean).length >= 2;
}

function getNextLevel(currentLevel: SpanishLevel): SpanishLevel {
  const levels: SpanishLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const currentIndex = levels.indexOf(currentLevel);
  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : currentLevel;
}

function calculateProgressToNextLevel(
  currentLevel: SpanishLevel, 
  nextLevel: SpanishLevel, 
  topicScores: Record<string, number>,
  skillScores: Record<string, number>
): number {
  if (currentLevel === nextLevel) return 100;

  const requirements = LEVEL_REQUIREMENTS[nextLevel as keyof typeof LEVEL_REQUIREMENTS];
  if (!requirements) return 0;

  // Check topic requirements
  const topicProgress = requirements.requiredTopics.map(topic => {
    const score = topicScores[topic] || 0;
    return Math.min(100, (score / requirements.minScore) * 100);
  });

  // Check skill requirements
  const skillProgress = Object.entries(requirements.skillThresholds).map(([skill, threshold]) => {
    const score = skillScores[skill] || 0;
    return Math.min(100, (score / threshold) * 100);
  });

  // Combine all progress measures
  const allProgress = [...topicProgress, ...skillProgress];
  return allProgress.reduce((sum, progress) => sum + progress, 0) / allProgress.length;
}

function calculateExercisesNeeded(
  currentLevel: SpanishLevel, 
  topicScores: Record<string, number>, 
  weaknessAreas: string[]
): number {
  const requirements = LEVEL_REQUIREMENTS[currentLevel as keyof typeof LEVEL_REQUIREMENTS];
  if (!requirements) return 20;

  // Base exercises needed
  let exercisesNeeded = requirements.exercisesPerTopic;

  // Add extra exercises for weak areas
  exercisesNeeded += weaknessAreas.length * 5;

  // Add exercises for uncovered topics
  const coveredTopics = Object.keys(topicScores);
  const missingTopics = requirements.requiredTopics.filter(topic => !coveredTopics.includes(topic));
  exercisesNeeded += missingTopics.length * 10;

  return Math.min(50, Math.max(10, exercisesNeeded));
}

export async function generateAdaptiveExerciseRecommendations(userId: string): Promise<{
  recommendedTopics: string[];
  recommendedDifficulty: 'easy' | 'medium' | 'hard';
  recommendedTypes: string[];
  focusAreas: string[];
}> {
  const analysis = await analyzeProficiency(userId);

  // Recommend topics based on weaknesses and level requirements
  const recommendedTopics = analysis.weaknessAreas.length > 0 
    ? analysis.weaknessAreas 
    : LEVEL_REQUIREMENTS[analysis.currentLevel as keyof typeof LEVEL_REQUIREMENTS]?.requiredTopics || [];

  // Recommend difficulty based on recent performance
  let recommendedDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
  if (analysis.confidenceScore < 60) {
    recommendedDifficulty = 'easy';
  } else if (analysis.confidenceScore > 85 && analysis.detailedAnalysis.difficultyProgression) {
    recommendedDifficulty = 'hard';
  }

  // Recommend exercise types based on skill gaps
  const skillGaps = Object.entries(analysis.detailedAnalysis.skillDistribution)
    .filter(([_, score]) => score < 75)
    .map(([skill]) => skill);

  const recommendedTypes = skillGaps.length > 0 ? skillGaps : ['multiple_choice', 'fill_blank'];

  // Focus areas for improvement
  const focusAreas = [
    ...analysis.weaknessAreas,
    ...(analysis.detailedAnalysis.consistencyScore < 70 ? ['Consistency improvement'] : []),
    ...(analysis.progressToNextLevel > 80 ? ['Level advancement preparation'] : [])
  ];

  return {
    recommendedTopics: recommendedTopics.slice(0, 3),
    recommendedDifficulty,
    recommendedTypes: recommendedTypes.slice(0, 2),
    focusAreas: focusAreas.slice(0, 3)
  };
}
