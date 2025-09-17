'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Topic, Exercise, UserProgress, SpanishLevel } from '@/types/database';

interface LearningPathProps {
  level: SpanishLevel;
  topics: Topic[];
  exercises: Exercise[];
  userProgress: UserProgress[];
  onRefresh: () => Promise<void>;
}

interface LessonNode {
  id: string;
  name: string;
  type: 'topic' | 'practice' | 'test';
  topicId?: string;
  exerciseCount: number;
  completedCount: number;
  unlocked: boolean;
  position: { x: number; y: number };
  color: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export default function LearningPath({ level, topics, exercises, userProgress, onRefresh }: LearningPathProps) {
  const [pathNodes, setPathNodes] = useState<LessonNode[]>([]);
  const [userStats, setUserStats] = useState({
    totalLessons: 0,
    completedLessons: 0,
    currentStreak: 0,
    totalXP: 0
  });

  const supabase = createClient();

  useEffect(() => {
    generateLearningPath();
    calculateUserStats();
  }, [topics, exercises, userProgress]);

  const generateLearningPath = () => {
    const nodes: LessonNode[] = [];
    const colors = ['#58CC02', '#00CD9C', '#00B4F0', '#CE82FF', '#FF4B4B', '#FF9600'];
    
    topics.forEach((topic, topicIndex) => {
      const topicExercises = exercises.filter(ex => ex.topic_id === topic.id);
      const topicProgress = userProgress.filter(up => 
        topicExercises.some(ex => ex.id === up.exercise_id)
      );
      
      const completedCount = topicProgress.filter(up => up.completed).length;
      
      // MODIFIED: Always unlock all topics for topic jumping
      const unlocked = true; // Previously: topicIndex === 0 || pathNodes[pathNodes.length - 1]?.completed || false;
      
      // Calculate position (zigzag pattern)
      const zigzag = topicIndex % 2 === 0;
      const row = Math.floor(topicIndex / 2);
      
      nodes.push({
        id: `topic-${topic.id}`,
        name: topic.name_da,
        type: 'topic',
        topicId: topic.id.toString(),
        exerciseCount: topicExercises.length,
        completedCount,
        unlocked,
        position: { 
          x: zigzag ? 100 : 300, 
          y: 100 + (row * 150) 
        },
        color: colors[topicIndex % colors.length],
        difficulty: getDifficultyForTopic(topic, level)
      });

      // Add practice nodes occasionally
      if (topicIndex > 0 && topicIndex % 3 === 0) {
        nodes.push({
          id: `practice-${topicIndex}`,
          name: `Øvelse ${Math.floor(topicIndex/3)}`,
          type: 'practice',
          exerciseCount: 5,
          completedCount: 0,
          unlocked: true, // Always unlocked for topic jumping
          position: { 
            x: 200, 
            y: 80 + (row * 150) 
          },
          color: '#FFD900',
          difficulty: 'medium'
        });
      }
    });

    setPathNodes(nodes);
  };

  const getDifficultyForTopic = (topic: Topic, level: SpanishLevel): 'easy' | 'medium' | 'hard' => {
    const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const currentLevelIndex = levelOrder.indexOf(level);
    
    // This is a simplified difficulty assessment
    if (currentLevelIndex <= 1) return 'easy';
    if (currentLevelIndex <= 3) return 'medium';
    return 'hard';
  };

  const calculateUserStats = () => {
    const totalLessons = pathNodes.length;
    const completedLessons = pathNodes.filter(node => 
      node.completedCount >= node.exerciseCount
    ).length;
    
    setUserStats({
      totalLessons,
      completedLessons,
      currentStreak: calculateStreak(),
      totalXP: userProgress.reduce((sum, up) => sum + (up.score || 0), 0)
    });
  };

  const calculateStreak = (): number => {
    // Simplified streak calculation
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
    if (!node.unlocked) {
      return;
    }

    if (node.type === 'topic' && node.topicId) {
      // Navigate to topic page that shows all exercises for the topic
      window.location.href = `/topic/${node.topicId}`;
    } else if (node.type === 'practice') {
      // Navigate to practice mode
      window.location.href = `/practice/${level}`;
    }
  };

  const getNodeIcon = (node: LessonNode) => {
    if (node.completedCount >= node.exerciseCount) {
      return '✅';
    }
    if (node.completedCount > 0) {
      return '⏳';
    }
    if (!node.unlocked) {
      return '🔒';
    }
    
    switch (node.type) {
      case 'topic': return '📚';
      case 'practice': return '🏋️';
      case 'test': return '🏆';
      default: return '📖';
    }
  };

  const getProgressPercentage = (node: LessonNode) => {
    if (node.exerciseCount === 0) return 0;
    return Math.round((node.completedCount / node.exerciseCount) * 100);
  };

  if (pathNodes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Genererer læringssti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      {/* Header Stats */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              🎯 {level} Læringssti
            </h1>
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Opdater
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{userStats.completedLessons}</div>
              <div className="text-sm text-gray-600">Fuldførte lektioner</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{userStats.currentStreak}</div>
              <div className="text-sm text-gray-600">Dages streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{userStats.totalXP}</div>
              <div className="text-sm text-gray-600">Total XP</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round((userStats.completedLessons / userStats.totalLessons) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Fremgang</div>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Path */}
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none" 
            style={{ height: `${Math.max(...pathNodes.map(n => n.position.y)) + 100}px` }}
          >
            {/* Draw connecting lines between nodes */}
            {pathNodes.map((node, index) => {
              if (index === pathNodes.length - 1) return null;
              const nextNode = pathNodes[index + 1];
              return (
                <line
                  key={`line-${index}`}
                  x1={node.position.x + 50}
                  y1={node.position.y + 50}
                  x2={nextNode.position.x + 50}
                  y2={nextNode.position.y + 50}
                  stroke="#E5E7EB"
                  strokeWidth="4"
                  strokeDasharray={node.unlocked && nextNode.unlocked ? "0" : "8,8"}
                />
              );
            })}
          </svg>

          {/* Render lesson nodes */}
          {pathNodes.map((node) => (
            <div
              key={node.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                node.unlocked ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}
              style={{
                left: node.position.x,
                top: node.position.y,
              }}
              onClick={() => handleNodeClick(node)}
            >
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl shadow-lg border-4 transition-transform hover:scale-110 ${
                  node.unlocked ? 'border-white' : 'border-gray-400'
                } ${node.completedCount >= node.exerciseCount ? 'ring-4 ring-green-300' : ''}`}
                style={{
                  backgroundColor: node.unlocked ? node.color : '#9CA3AF',
                  opacity: node.unlocked ? 1 : 0.6
                }}
              >
                <span className="text-white text-xl">
                  {getNodeIcon(node)}
                </span>
              </div>
              
              {/* Progress indicator */}
              {node.exerciseCount > 0 && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
                  <div className="bg-white rounded-full px-2 py-1 shadow-md text-xs font-medium">
                    {getProgressPercentage(node)}%
                  </div>
                </div>
              )}

              {/* Node label */}
              <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center">
                <div className="bg-white rounded-lg px-3 py-1 shadow-md max-w-32">
                  <div className="text-xs font-medium text-gray-900 truncate">
                    {node.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {node.completedCount}/{node.exerciseCount}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}