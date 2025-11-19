// Speech Recognition MCP Client
// Supports multiple providers: OpenAI Whisper, Azure Speech, Google Cloud Speech

export type SpeechProvider = 'whisper' | 'azure' | 'google';

export interface SpeechRecognitionOptions {
  audioBlob: Blob;
  language: 'es' | 'pt';
  provider?: SpeechProvider;
  expectedText?: string; // For comparison and scoring
  promptContext?: string; // Context to improve accuracy
}

export interface SpeechRecognitionResult {
  transcribedText: string;
  confidence: number; // 0 to 1
  pronunciationScore?: number; // 0 to 100
  accuracyScore?: number; // 0 to 100 (vs expected text)
  wordScores?: Array<{
    word: string;
    pronunciationScore: number;
    accuracy: 'correct' | 'incorrect' | 'omitted' | 'inserted';
  }>;
  feedback?: string;
  provider: SpeechProvider;
}

/**
 * Transcribe audio and analyze pronunciation
 */
export async function transcribeAndAnalyze(
  options: SpeechRecognitionOptions
): Promise<SpeechRecognitionResult> {
  const provider = options.provider || 'whisper';
  
  // Check for MCP server connection first
  if (process.env.NEXT_PUBLIC_MCP_SPEECH_ENABLED === 'true') {
    return transcribeViaMCP(options);
  }
  
  // Fallback to direct API implementation
  switch (provider) {
    case 'azure':
      return transcribeAzure(options);
    case 'google':
      return transcribeGoogle(options);
    case 'whisper':
    default:
      return transcribeWhisper(options);
  }
}

/**
 * Transcribe via MCP server (future implementation)
 */
async function transcribeViaMCP(
  options: SpeechRecognitionOptions
): Promise<SpeechRecognitionResult> {
  try {
    const formData = new FormData();
    formData.append('audio', options.audioBlob);
    formData.append('language', options.language);
    if (options.expectedText) {
      formData.append('expectedText', options.expectedText);
    }
    if (options.promptContext) {
      formData.append('context', options.promptContext);
    }
    
    const response = await fetch('/api/speech/transcribe', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Speech recognition failed');
    
    return await response.json();
  } catch (error) {
    console.error('MCP speech recognition failed, using fallback:', error);
    return transcribeWhisper(options);
  }
}

/**
 * Transcribe using OpenAI Whisper
 */
async function transcribeWhisper(
  options: SpeechRecognitionOptions
): Promise<SpeechRecognitionResult> {
  const formData = new FormData();
  formData.append('file', options.audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', options.language);
  
  if (options.promptContext) {
    formData.append('prompt', options.promptContext);
  }
  
  const response = await fetch('/api/speech/whisper', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Whisper transcription failed');
  }
  
  const data = await response.json();
  const transcribedText = data.text;
  
  // Calculate scores if we have expected text
  let pronunciationScore: number | undefined;
  let accuracyScore: number | undefined;
  
  if (options.expectedText) {
    const comparison = compareTexts(transcribedText, options.expectedText);
    pronunciationScore = comparison.pronunciationScore;
    accuracyScore = comparison.accuracyScore;
  }
  
  return {
    transcribedText,
    confidence: 0.85, // Whisper doesn't provide confidence scores
    pronunciationScore,
    accuracyScore,
    provider: 'whisper'
  };
}

/**
 * Transcribe using Azure Speech Services
 * Includes pronunciation assessment
 */
async function transcribeAzure(
  options: SpeechRecognitionOptions
): Promise<SpeechRecognitionResult> {
  const formData = new FormData();
  formData.append('audio', options.audioBlob);
  formData.append('language', options.language === 'es' ? 'es-ES' : 'pt-BR');
  
  if (options.expectedText) {
    formData.append('referenceText', options.expectedText);
  }
  
  const response = await fetch('/api/speech/azure', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Azure speech recognition failed');
  }
  
  const data = await response.json();
  
  return {
    transcribedText: data.text,
    confidence: data.confidence,
    pronunciationScore: data.pronunciationScore,
    accuracyScore: data.accuracyScore,
    wordScores: data.words,
    provider: 'azure'
  };
}

/**
 * Transcribe using Google Cloud Speech
 */
async function transcribeGoogle(
  options: SpeechRecognitionOptions
): Promise<SpeechRecognitionResult> {
  const formData = new FormData();
  formData.append('audio', options.audioBlob);
  formData.append('language', options.language === 'es' ? 'es-ES' : 'pt-BR');
  
  const response = await fetch('/api/speech/google', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Google speech recognition failed');
  }
  
  const data = await response.json();
  
  // Calculate scores if we have expected text
  let pronunciationScore: number | undefined;
  let accuracyScore: number | undefined;
  
  if (options.expectedText) {
    const comparison = compareTexts(data.text, options.expectedText);
    pronunciationScore = comparison.pronunciationScore;
    accuracyScore = comparison.accuracyScore;
  }
  
  return {
    transcribedText: data.text,
    confidence: data.confidence,
    pronunciationScore,
    accuracyScore,
    provider: 'google'
  };
}

/**
 * Compare transcribed text with expected text
 * Calculate pronunciation and accuracy scores
 */
function compareTexts(
  transcribed: string,
  expected: string
): { pronunciationScore: number; accuracyScore: number } {
  // Normalize texts
  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:]/g, '')
      .replace(/\s+/g, ' ');
  
  const normalizedTranscribed = normalizeText(transcribed);
  const normalizedExpected = normalizeText(expected);
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(normalizedTranscribed, normalizedExpected);
  const maxLength = Math.max(normalizedTranscribed.length, normalizedExpected.length);
  
  // Calculate accuracy (0-100)
  const accuracyScore = Math.max(0, Math.round((1 - distance / maxLength) * 100));
  
  // Calculate pronunciation score (more lenient than accuracy)
  // Split into words and check word-level matches
  const transcribedWords = normalizedTranscribed.split(' ');
  const expectedWords = normalizedExpected.split(' ');
  
  let correctWords = 0;
  expectedWords.forEach((expectedWord) => {
    if (transcribedWords.some((tw) => tw === expectedWord)) {
      correctWords++;
    } else if (
      transcribedWords.some(
        (tw) => levenshteinDistance(tw, expectedWord) <= Math.ceil(expectedWord.length * 0.2)
      )
    ) {
      correctWords += 0.7; // Partial credit for close matches
    }
  });
  
  const pronunciationScore = Math.round((correctWords / expectedWords.length) * 100);
  
  return { pronunciationScore, accuracyScore };
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Generate AI feedback based on pronunciation results
 */
export async function generatePronunciationFeedback(
  result: SpeechRecognitionResult,
  language: 'es' | 'pt'
): Promise<{ feedback_da: string; feedback: string }> {
  try {
    const response = await fetch('/api/speech/generate-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcribed_text: result.transcribedText,
        pronunciation_score: result.pronunciationScore,
        accuracy_score: result.accuracyScore,
        word_scores: result.wordScores,
        language
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate feedback');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to generate pronunciation feedback:', error);
    
    // Fallback feedback
    const score = result.pronunciationScore || 0;
    if (score >= 80) {
      return {
        feedback_da: 'Fremragende udtale! Bliv ved med det gode arbejde.',
        feedback: language === 'es' ? '¡Excelente pronunciación! Sigue así.' : 'Excelente pronúncia! Continue assim.'
      };
    } else if (score >= 60) {
      return {
        feedback_da: 'God indsats! Øv nogle af ordene lidt mere.',
        feedback: language === 'es' ? '¡Buen esfuerzo! Practica algunas palabras más.' : 'Bom esforço! Pratique algumas palavras mais.'
      };
    } else {
      return {
        feedback_da: 'Bliv ved med at øve! Lyt til eksemplet igen og prøv en gang til.',
        feedback: language === 'es' ? '¡Sigue practicando! Escucha el ejemplo otra vez e inténtalo de nuevo.' : 'Continue praticando! Ouça o exemplo novamente e tente outra vez.'
      };
    }
  }
}
