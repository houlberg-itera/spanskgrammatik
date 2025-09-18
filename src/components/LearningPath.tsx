'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Topic, Exercise, UserProgress, SpanishLevel } from '@/types/database';

interface LearningPathProps {
  level: SpanishLevel;
  topics: Topic[];
  exercises: Exercise[];
  userProgress: UserProgress[];
}

interface LessonNode {
  id: string;
  name: string;
  type: 'topic' | 'practice' | 'test' | 'milestone';
  topicId?: string;
  exerciseCount: number;
  completedCount: number;
  unlocked: boolean;
  position: { x: number; y: number };
  color: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  importance: 'foundation' | 'core' | 'advanced' | 'practice';
}

export default function LearningPath({ level, topics, exercises, userProgress }: LearningPathProps) {
  const [pathNodes, setPathNodes] = useState<LessonNode[]>([]);
  const [userStats, setUserStats] = useState({
    totalLessons: 0,
    completedLessons: 0,
    currentStreak: 0,
    totalXP: 0
  });

  const supabase = createClient();

  // Enhanced color scheme with better visual hierarchy
  const colorScheme = {
    foundation: { bg: '#4F46E5', ring: '#6366F1', shadow: '#312E81' },
    core: { bg: '#059669', ring: '#10B981', shadow: '#064E3B' },
    advanced: { bg: '#DC2626', ring: '#EF4444', shadow: '#7F1D1D' },
    practice: { bg: '#7C3AED', ring: '#8B5CF6', shadow: '#4C1D95' },
    milestone: { bg: '#F59E0B', ring: '#FBBF24', shadow: '#92400E' }
  };

  // Intelligent topic categorization
  const topicCategories = {
    A1: {
      foundation: ['substantiver', 'artikler', 'verbos', 'present', 'ser', 'estar'],
      core: ['adjektiver', 'familie', 'farver', 'tal', 'tid', 'mad', 'hjem'],
      advanced: ['passé', 'futuro', 'imperativ', 'reflexive']
    },
    A2: {
      foundation: ['subjunktiv', 'konditional', 'reflexive', 'gerundio'],
      core: ['kroppen', 'vejr', 'transport', 'arbejde'],
      advanced: ['fortid', 'fremtid', 'sammensatte', 'formelt']
    },
    B1: {
      foundation: ['kompleks', 'subordination', 'litteratur'],
      core: ['kultur', 'historie', 'samfund', 'politik'],
      advanced: ['akademisk', 'forretning', 'avanceret']
    }
  };

  useEffect(() => {
    generateLearningPath();
  }, [topics, exercises, userProgress]);

  useEffect(() => {
    calculateUserStats();
  }, [topics, exercises, userProgress]);

  const categorizeTopics = (topics: Topic[]) => {
    const categories = topicCategories[level] || topicCategories.A1;
    const categorizedTopics: { [key: string]: Topic[] } = {
      foundation: [],
      core: [],
      advanced: [],
      other: []
    };

    topics.forEach(topic => {
      const topicKey = (topic.name_da || topic.name_es || '').toLowerCase();
      let placed = false;

      for (const [category, keywords] of Object.entries(categories)) {
        if (Array.isArray(keywords) && keywords.some(keyword => topicKey.includes(keyword))) {
          categorizedTopics[category].push(topic);
          placed = true;
          break;
        }
      }

      if (!placed) {
        categorizedTopics.other.push(topic);
      }
    });

    return categorizedTopics;
  };

  const generateLearningPath = () => {
    const nodes: LessonNode[] = [];
    
    if (!topics || topics.length === 0) {
      setPathNodes([]);
      return;
    }

    // Sort topics by order_index first
    const sortedTopics = [...topics].sort((a, b) => a.order_index - b.order_index);
    const categorizedTopics = categorizeTopics(sortedTopics);
    
    let globalIndex = 0;
    const containerWidth = 600; // Narrower like Duolingo
    const verticalSpacing = 120; // Closer vertical spacing
    const centerX = containerWidth * 0.5;

    // Process categories in learning order
    const processOrder = ['foundation', 'core', 'advanced', 'other'];
    
    processOrder.forEach((categoryName, categoryIndex) => {
      const categoryTopics = categorizedTopics[categoryName];
      if (categoryTopics.length === 0) return;

      categoryTopics.forEach((topic, topicIndex) => {
        // Get all exercises for this topic
        const topicExercises = exercises.filter(ex => ex.topic_id === topic.id);
        const completedExerciseIds = new Set(
          userProgress.filter(up => up.completed).map(up => up.exercise_id)
        );
        
        // Count total questions and completed questions for this topic
        let totalQuestions = 0;
        let completedQuestions = 0;
        
        topicExercises.forEach(exercise => {
          if (exercise.content && exercise.content.questions) {
            const questionCount = exercise.content.questions.length;
            totalQuestions += questionCount;
            
            // If this exercise is completed, count all its questions as completed
            if (completedExerciseIds.has(exercise.id)) {
              completedQuestions += questionCount;
            }
          }
        });

        // Debug logging for mismatches
        if (topic.id === 2 || topic.id === 3) {
          console.log(`Topic ${topic.id} (${topic.name_da}):`, {
            totalQuestions,
            completedQuestions,
            exerciseCount: topicExercises.length,
            completedExercises: topicExercises.filter(ex => completedExerciseIds.has(ex.id)).length,
            completedExerciseIds: Array.from(completedExerciseIds)
          });
        }

        // Duolingo-style vertical positioning with slight alternating offset
        const row = globalIndex;
        const isEven = row % 2 === 0;
        const x = isEven ? centerX - 60 : centerX + 60; // Slight left/right alternation
        const y = 80 + (row * verticalSpacing);

        const importance = categoryName === 'foundation' ? 'foundation' :
                          categoryName === 'core' ? 'core' :
                          categoryName === 'advanced' ? 'advanced' : 'core';

        const node: LessonNode = {
          id: `topic-${topic.id}`,
          name: topic.name_da || topic.name_es || 'Unknown Topic',
          type: 'topic',
          topicId: topic.id.toString(),
          exerciseCount: totalQuestions,
          completedCount: completedQuestions,
          unlocked: true, // Allow topic jumping
          difficulty: getDifficultyForTopic(topic, level),
          color: colorScheme[importance as keyof typeof colorScheme].bg,
          position: { x, y },
          category: categoryName,
          importance: importance as any
        };

        nodes.push(node);
        globalIndex++;
      });
    });

    setPathNodes(nodes);
  };

  const getDifficultyForTopic = (topic: Topic, level: SpanishLevel): 'easy' | 'medium' | 'hard' => {
    const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const currentLevelIndex = levelOrder.indexOf(level);
    
    if (currentLevelIndex <= 1) return 'easy';
    if (currentLevelIndex <= 3) return 'medium';
    return 'hard';
  };

  const calculateUserStats = () => {
    // Calculate stats based on completed topics, not individual exercises
    const completedExerciseIds = new Set(
      userProgress.filter(up => up.completed).map(up => up.exercise_id)
    );
    
    // Count topics that have ALL their exercises completed
    const completedTopics = topics.filter(topic => {
      const topicExercises = exercises.filter(ex => ex.topic_id === topic.id);
      if (topicExercises.length === 0) return false;
      
      // Check if ALL exercises in this topic are completed
      return topicExercises.every(ex => completedExerciseIds.has(ex.id));
    });
    
    setUserStats({
      totalLessons: topics.length,
      completedLessons: completedTopics.length,
      currentStreak: calculateStreak(),
      totalXP: userProgress.reduce((sum, up) => sum + (up.score || 0), 0)
    });
  };

  const calculateStreak = (): number => {
    const recentCompletions = userProgress
      .filter(up => up.completed)
      .sort((a, b) => new Date(b.completed_at || '').getTime() - new Date(a.completed_at || '').getTime());
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const completion of recentCompletions) {
      const completionDate = new Date(completion.completed_at || '');
      completionDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const handleNodeClick = (node: LessonNode) => {
    if (!node.unlocked) return;

    if (node.type === 'topic' && node.topicId) {
      window.location.href = `/topic/${node.topicId}`;
    } else if (node.type === 'practice') {
      window.location.href = `/practice/${level}`;
    }
  };

  const getNodeIcon = (node: LessonNode) => {
    if (node.completedCount >= node.exerciseCount && node.exerciseCount > 0) {
      return '✅';
    }
    if (node.completedCount > 0) {
      return '⏳';
    }
    if (!node.unlocked) {
      return '🔒';
    }
    
    switch (node.type) {
      case 'topic': 
        return node.importance === 'foundation' ? '🏗️' :
               node.importance === 'core' ? '📚' :
               node.importance === 'advanced' ? '🎓' : '📖';
      case 'practice': return '💪';
      case 'milestone': return '🎯';
      case 'test': return '🏆';
      default: return '📖';
    }
  };

  const getProgressPercentage = (node: LessonNode) => {
    if (node.exerciseCount === 0) return 0;
    return Math.round((node.completedCount / node.exerciseCount) * 100);
  };

  const getNodeShadow = (node: LessonNode) => {
    if (node.completedCount >= node.exerciseCount && node.exerciseCount > 0) {
      return 'rgba(34, 197, 94, 0.4)';
    }
    if (node.completedCount > 0) {
      return 'rgba(251, 191, 36, 0.4)';
    }
    return 'rgba(0, 0, 0, 0.1)';
  };

  if (pathNodes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full border-t-4 border-green-400 animate-pulse"></div>
          </div>
          <p className="text-gray-600 mt-6 text-lg">Genererer din personlige læringssti...</p>
          <p className="text-gray-500 mt-2 text-sm">Organiserer emner efter sværhedsgrad</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      {/* Enhanced Header Stats */}
      <div className="max-w-6xl mx-auto mb-12">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎯 {level} Læringssti
            </h1>
            <p className="text-gray-600">Intelligent organiseret efter vigtighed og sværhedsgrad</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
              <div className="text-3xl font-bold text-blue-600">{userStats.completedLessons}</div>
              <div className="text-sm text-gray-600 mt-1">Fuldførte emner</div>
            </div>
            <div className="text-center bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
              <div className="text-3xl font-bold text-green-600">{userStats.currentStreak}</div>
              <div className="text-sm text-gray-600 mt-1">Dages streak</div>
            </div>
            <div className="text-center bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
              <div className="text-3xl font-bold text-purple-600">{userStats.totalXP}</div>
              <div className="text-sm text-gray-600 mt-1">Total XP</div>
            </div>
            <div className="text-center bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
              <div className="text-3xl font-bold text-orange-600">
                {userStats.totalLessons > 0 ? Math.round((userStats.completedLessons / userStats.totalLessons) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Fremgang</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Learning Path */}
      <div className="max-w-4xl mx-auto">
        <div 
          className="relative bg-white/50 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-white/30"
          style={{ 
            minHeight: `${pathNodes.length > 0 ? Math.max(...pathNodes.map(n => n.position.y)) + 120 : 300}px` 
          }}
        >
          {/* Enhanced lesson nodes */}
          {pathNodes.map((node) => (
            <div
              key={node.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                node.unlocked ? 'cursor-pointer' : 'cursor-not-allowed'
              } transition-all duration-300 hover:scale-110`}
              style={{
                left: node.position.x,
                top: node.position.y,
              }}
              onClick={() => handleNodeClick(node)}
            >
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl shadow-xl border-4 transition-all duration-300 relative ${
                  node.unlocked ? 'border-white hover:shadow-2xl' : 'border-gray-400'
                } ${node.completedCount >= node.exerciseCount && node.exerciseCount > 0 ? 'ring-4 ring-green-300' : ''}`}
                style={{
                  backgroundColor: node.unlocked ? node.color : '#9CA3AF',
                  opacity: node.unlocked ? 1 : 0.6,
                  boxShadow: `0 8px 20px ${getNodeShadow(node)}`
                }}
              >
                <span className="text-white text-xl filter drop-shadow-lg">
                  {getNodeIcon(node)}
                </span>
                
                {/* Completion effect */}
                {node.completedCount >= node.exerciseCount && node.exerciseCount > 0 && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-green-400 opacity-20 animate-ping"></div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </>
                )}
              </div>
              
              {/* Progress indicator */}
              {node.exerciseCount > 0 && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
                  <div className="bg-white rounded-full px-2 py-1 shadow-md text-xs font-bold border border-gray-200">
                    <span className={
                      getProgressPercentage(node) === 100 ? 'text-green-600' :
                      getProgressPercentage(node) > 0 ? 'text-orange-500' : 'text-gray-500'
                    }>
                      {getProgressPercentage(node)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Node label */}
              <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center">
                <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1 shadow-md max-w-32 border border-gray-100">
                  <div className="text-xs font-semibold text-gray-900 truncate">
                    {node.name}
                  </div>
                  {node.exerciseCount > 0 && (
                    <div className="text-xs text-gray-600">
                      {node.completedCount}/{node.exerciseCount} spørgsmål
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}