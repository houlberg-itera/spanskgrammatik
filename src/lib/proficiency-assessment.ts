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

  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Analyzing proficiency for user:', userId);
  }

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

  console.log('📊 Raw proficiency query result:', { 
    error, 
    performancesCount: performances?.length || 0,
    userId 
  });

  if (error) {
    console.error('❌ Error fetching user performances:', error);
  }

  // If no individual exercise data, check level progress
  if (error || !performances || performances.length === 0) {
    console.log('⚠️ No individual exercise data found, checking level progress...');
    
    const { data: levelProgress, error: levelError } = await supabase
      .from('user_level_progress')
      .select('*')
      .eq('user_id', userId)
      .order('progress_percentage', { ascending: false });

    console.log('📈 Level progress data:', { 
      levelError, 
      levelProgressCount: levelProgress?.length || 0,
      userId 
    });

    if (levelError) {
      console.error('❌ Error fetching level progress:', levelError);
    }

    if (levelProgress && levelProgress.length > 0) {
      // Generate analysis based on level progress
      const maxProgress = Math.max(...levelProgress.map(lp => lp.progress_percentage || 0));
      const completedLevels = levelProgress.filter(lp => lp.completed_at).length;
      const avgProgress = levelProgress.reduce((sum, lp) => sum + (lp.progress_percentage || 0), 0) / levelProgress.length;
      
      // Determine current level based on progress
      let currentLevel: SpanishLevel = 'A1';
      let recommendedLevel: SpanishLevel = 'A1';
      
      if (maxProgress >= 80) {
        const highestLevel = levelProgress.find(lp => (lp.progress_percentage || 0) >= 80)?.level;
        currentLevel = (highestLevel as SpanishLevel) || 'A1';
      } else if (maxProgress >= 50) {
        const midLevel = levelProgress.find(lp => (lp.progress_percentage || 0) >= 50)?.level;
        currentLevel = (midLevel as SpanishLevel) || 'A1';
      }
      
      // Recommend next level
      if (currentLevel === 'A1' && maxProgress >= 70) recommendedLevel = 'A2';
      else if (currentLevel === 'A2' && maxProgress >= 70) recommendedLevel = 'B1';
      else recommendedLevel = currentLevel;

      console.log('✅ Generated analysis from level progress');
      return {
        currentLevel,
        confidenceScore: Math.min(maxProgress / 100, 0.9), // Convert to 0-1 scale
        strengthAreas: levelProgress
          .filter(lp => (lp.progress_percentage || 0) >= 60)
          .map(lp => `Niveau ${lp.level} (${lp.progress_percentage}% fremgang)`),
        weaknessAreas: levelProgress
          .filter(lp => (lp.progress_percentage || 0) < 40 && (lp.progress_percentage || 0) > 0)
          .map(lp => `Niveau ${lp.level} (kun ${lp.progress_percentage}% fremgang)`),
        recommendedLevel,
        progressToNextLevel: Math.max(0, maxProgress), // Fixed: show actual progress, not remaining
        exercisesNeeded: Math.max(5, Math.round((100 - maxProgress) / 10)),
        detailedAnalysis: {
          topicScores: {},
          skillDistribution: {},
          difficultyProgression: maxProgress >= 60,
          consistencyScore: avgProgress / 100
        }
      };
    }

    // Return default analysis for truly new users
    console.log('⚠️ No progress data found at all, returning default analysis');
    return {
      currentLevel: 'A1',
      confidenceScore: 0,
      strengthAreas: [],
      weaknessAreas: ['Ingen data fundet - begynd at tage øvelser for at se din fremgang'],
      recommendedLevel: 'A1',
      progressToNextLevel: 0, // Fixed: show 0% progress for users with no data
      exercisesNeeded: 50,
      detailedAnalysis: {
        topicScores: {},
        skillDistribution: {},
        difficultyProgression: false,
        consistencyScore: 0
      }
    };
  }

  console.log('✅ Found performance data:', performances.length, 'exercises');

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
