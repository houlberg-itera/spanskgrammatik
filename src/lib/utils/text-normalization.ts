/**
 * Text normalization and comparison utilities for exercise answers
 */

/**
 * Normalizes text by:
 * - Converting to lowercase
 * - Removing accents from Spanish/Portuguese characters
 * - Removing punctuation
 * - Normalizing whitespace
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Normalize Spanish/Portuguese special characters to basic letters
    .replace(/[áàâäã]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôöõ]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/ç/g, 'c')
    // Remove all punctuation and special characters
    .replace(/[.,!?;:'"()\[\]{}¡¿]/g, '')
    // Remove extra spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compares two answers with normalization for special characters
 * @param userAnswer - The user's answer
 * @param correctAnswer - The correct answer
 * @returns true if answers match (with or without normalization)
 */
export function compareAnswers(userAnswer: string, correctAnswer: string): boolean {
  const originalUserAnswer = userAnswer.toLowerCase().trim();
  const originalCorrectAnswer = correctAnswer.toLowerCase().trim();
  
  // Check exact match first (case-insensitive only)
  if (originalUserAnswer === originalCorrectAnswer) {
    return true;
  }

  // Check normalized match (without special characters and punctuation)
  const normalizedUserAnswer = normalizeText(userAnswer);
  const normalizedCorrectAnswer = normalizeText(correctAnswer);
  
  return normalizedUserAnswer === normalizedCorrectAnswer;
}

/**
 * Checks if a user's answer is correct, handling both single and array answers
 * @param userAnswer - The user's answer (string or array)
 * @param correctAnswer - The correct answer (string or array)
 * @param questionType - Type of question for special handling
 * @returns true if the answer is correct
 */
export function isAnswerCorrect(
  userAnswer: string | string[] | undefined | null,
  correctAnswer: string | string[],
  questionType?: string
): boolean {
  if (!userAnswer || userAnswer === '' || userAnswer === null) {
    return false;
  }

  // Handle array answers
  if (Array.isArray(correctAnswer)) {
    const userAnswerStr = Array.isArray(userAnswer) ? userAnswer.join(',') : String(userAnswer);
    const correctAnswerStr = correctAnswer.join(',');
    return compareAnswers(userAnswerStr, correctAnswerStr);
  }

  // Handle single string answers
  const userAnswerStr = Array.isArray(userAnswer) ? userAnswer.join(',') : String(userAnswer);
  const correctAnswerStr = String(correctAnswer);
  
  // For translation questions, also allow partial matches
  if (questionType === 'translation') {
    if (compareAnswers(userAnswerStr, correctAnswerStr)) {
      return true;
    }
    // Fallback to partial matching
    const normalizedUser = normalizeText(userAnswerStr);
    const normalizedCorrect = normalizeText(correctAnswerStr);
    return normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser);
  }

  return compareAnswers(userAnswerStr, correctAnswerStr);
}
