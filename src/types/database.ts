export type SpanishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type ExerciseType = 'grammar' | 'vocabulary' | 'conjugation' | 'sentence_structure';

export type QuestionType = 'multiple_choice' | 'fill_in_blank' | 'translation' | 'conjugation';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  current_level: SpanishLevel;
  created_at: string;
  updated_at: string;
}

export interface Level {
  id: number;
  name: SpanishLevel;
  description_da: string;
  description_es: string;
  order_index: number;
  created_at: string;
}

export interface Topic {
  id: number;
  level: SpanishLevel;
  name_da: string;
  name_es: string;
  description_da?: string;
  description_es?: string;
  order_index: number;
  created_at: string;
}

export interface Exercise {
  id: number;
  topic_id: number;
  level: SpanishLevel;
  type: ExerciseType;
  title_da: string;
  title_es: string;
  description_da?: string;
  description_es?: string;
  content: ExerciseContent;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExerciseContent {
  questions: Question[];
  instructions_da?: string;
  instructions_es?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  question_da: string;
  question_es?: string;
  options?: string[];
  correct_answer: string | string[];
  explanation_da?: string;
  explanation_es?: string;
  points?: number;
}

export interface UserProgress {
  id: number;
  user_id: string;
  exercise_id: number;
  completed: boolean;
  score?: number;
  attempts: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserLevelProgress {
  id: number;
  user_id: string;
  level: SpanishLevel;
  started_at: string;
  completed_at?: string;
  progress_percentage: number;
}

export interface ExerciseAttempt {
  exerciseId: number;
  answers: Record<string, string | string[]>;
  score: number;
  completedAt: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      levels: {
        Row: Level;
        Insert: Omit<Level, 'id' | 'created_at'>;
        Update: Partial<Omit<Level, 'id' | 'created_at'>>;
      };
      topics: {
        Row: Topic;
        Insert: Omit<Topic, 'id' | 'created_at'>;
        Update: Partial<Omit<Topic, 'id' | 'created_at'>>;
      };
      exercises: {
        Row: Exercise;
        Insert: Omit<Exercise, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Exercise, 'id' | 'created_at'>>;
      };
      user_progress: {
        Row: UserProgress;
        Insert: Omit<UserProgress, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProgress, 'id' | 'created_at'>>;
      };
      user_level_progress: {
        Row: UserLevelProgress;
        Insert: Omit<UserLevelProgress, 'id'>;
        Update: Partial<Omit<UserLevelProgress, 'id'>>;
      };
    };
    Functions: {
      update_user_progress: {
        Args: {
          exercise_id_param: number;
          score_param: number;
        };
        Returns: void;
      };
    };
  };
}
