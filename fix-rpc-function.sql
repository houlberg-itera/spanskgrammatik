-- Fixed RPC function to properly update user_level_progress
-- This fixes the issue where progress_percentage remains 0

CREATE OR REPLACE FUNCTION public.update_user_progress(
  exercise_id_param INTEGER,
  score_param INTEGER
)
RETURNS void AS $$
DECLARE
  current_user_id UUID := auth.uid();
  exercise_level spanish_level;
  total_exercises INTEGER;
  completed_exercises INTEGER;
  level_progress INTEGER;
BEGIN
  -- Get exercise level
  SELECT level INTO exercise_level FROM public.exercises WHERE id = exercise_id_param;
  
  -- Update or insert user progress
  INSERT INTO public.user_progress (user_id, exercise_id, score, attempts, completed, completed_at)
  VALUES (current_user_id, exercise_id_param, score_param, 1, score_param >= 70, NOW())
  ON CONFLICT (user_id, exercise_id)
  DO UPDATE SET
    score = GREATEST(user_progress.score, score_param),
    attempts = user_progress.attempts + 1,
    completed = (GREATEST(user_progress.score, score_param) >= 70),
    completed_at = CASE WHEN (GREATEST(user_progress.score, score_param) >= 70) THEN NOW() ELSE user_progress.completed_at END,
    updated_at = NOW();
  
  -- Calculate level progress
  SELECT COUNT(*) INTO total_exercises
  FROM public.exercises
  WHERE level = exercise_level;
  
  SELECT COUNT(*) INTO completed_exercises
  FROM public.user_progress up
  JOIN public.exercises e ON up.exercise_id = e.id
  WHERE up.user_id = current_user_id
    AND e.level = exercise_level
    AND up.completed = true;
  
  level_progress := CASE WHEN total_exercises > 0 THEN (completed_exercises * 100 / total_exercises) ELSE 0 END;
  
  -- FIXED: Use proper UPSERT for level progress
  INSERT INTO public.user_level_progress (user_id, level, progress_percentage, completed_at)
  VALUES (
    current_user_id, 
    exercise_level, 
    level_progress,
    CASE WHEN level_progress >= 100 THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, level) 
  DO UPDATE SET
    progress_percentage = level_progress,
    completed_at = CASE WHEN level_progress >= 100 THEN NOW() ELSE user_level_progress.completed_at END;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;