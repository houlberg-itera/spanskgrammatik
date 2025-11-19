// TTS (Text-to-Speech) MCP Client
// Supports multiple providers: ElevenLabs, Azure TTS, OpenAI TTS

export type TTSProvider = 'elevenlabs' | 'azure' | 'openai';

export interface TTSOptions {
  text: string;
  language: 'es' | 'pt';
  provider?: TTSProvider;
  voiceId?: string;
  speed?: number; // 0.5 to 2.0
  stability?: number; // 0 to 1 (ElevenLabs only)
  similarityBoost?: number; // 0 to 1 (ElevenLabs only)
}

export interface TTSResult {
  audioUrl: string;
  audioBuffer?: ArrayBuffer;
  duration?: number;
  provider: TTSProvider;
}

// Voice configurations for different languages and providers
const VOICE_CONFIGS = {
  elevenlabs: {
    es: {
      male: 'Xb7hH8MSUJpSbSDYk0k2', // Example voice ID
      female: 'pNInz6obpgDQGcFmaJgB'
    },
    pt: {
      male: 'yoZ06aMxZJJ28mfd3POQ',
      female: 'jsCqWAovK2LkecY7zXl4'
    }
  },
  azure: {
    es: {
      male: 'es-ES-AlvaroNeural',
      female: 'es-ES-ElviraNeural'
    },
    pt: {
      male: 'pt-BR-AntonioNeural',
      female: 'pt-BR-FranciscaNeural'
    }
  },
  openai: {
    voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
  }
};

/**
 * Generate speech from text using TTS provider
 * For production use, this would connect to an MCP server
 * For now, it uses direct API calls as a fallback
 */
export async function generateSpeech(options: TTSOptions): Promise<TTSResult> {
  const provider = options.provider || 'openai';
  
  // Check for MCP server connection first
  if (process.env.NEXT_PUBLIC_MCP_TTS_ENABLED === 'true') {
    return generateSpeechViaMCP(options);
  }
  
  // Fallback to direct API implementation
  switch (provider) {
    case 'elevenlabs':
      return generateSpeechElevenLabs(options);
    case 'azure':
      return generateSpeechAzure(options);
    case 'openai':
    default:
      return generateSpeechOpenAI(options);
  }
}

/**
 * Generate speech via MCP server (future implementation)
 */
async function generateSpeechViaMCP(options: TTSOptions): Promise<TTSResult> {
  // This would connect to the MCP TTS server
  // For now, falling back to direct implementation
  const provider = options.provider || 'openai';
  
  try {
    const response = await fetch('/api/tts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    
    if (!response.ok) throw new Error('TTS generation failed');
    
    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    
    return {
      audioUrl,
      provider,
      duration: 0 // Would be calculated from audio
    };
  } catch (error) {
    console.error('MCP TTS failed, using fallback:', error);
    return generateSpeechOpenAI(options);
  }
}

/**
 * Generate speech using OpenAI TTS API
 */
async function generateSpeechOpenAI(options: TTSOptions): Promise<TTSResult> {
  const { text, speed = 1.0, voiceId = 'nova' } = options;
  
  const response = await fetch('/api/tts/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voice: voiceId,
      speed,
      model: 'tts-1' // or 'tts-1-hd' for higher quality
    })
  });
  
  if (!response.ok) {
    throw new Error('OpenAI TTS failed');
  }
  
  const blob = await response.blob();
  const audioUrl = URL.createObjectURL(blob);
  
  return {
    audioUrl,
    provider: 'openai'
  };
}

/**
 * Generate speech using ElevenLabs API
 */
async function generateSpeechElevenLabs(options: TTSOptions): Promise<TTSResult> {
  const { text, language, voiceId, stability = 0.5, similarityBoost = 0.75 } = options;
  
  // Select default voice if not provided
  const defaultVoice = VOICE_CONFIGS.elevenlabs[language].female;
  const voice = voiceId || defaultVoice;
  
  const response = await fetch('/api/tts/elevenlabs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voice_id: voice,
      stability,
      similarity_boost: similarityBoost
    })
  });
  
  if (!response.ok) {
    throw new Error('ElevenLabs TTS failed');
  }
  
  const blob = await response.blob();
  const audioUrl = URL.createObjectURL(blob);
  
  return {
    audioUrl,
    provider: 'elevenlabs'
  };
}

/**
 * Generate speech using Azure TTS
 */
async function generateSpeechAzure(options: TTSOptions): Promise<TTSResult> {
  const { text, language, voiceId } = options;
  
  // Select default voice if not provided
  const defaultVoice = VOICE_CONFIGS.azure[language].female;
  const voice = voiceId || defaultVoice;
  
  const response = await fetch('/api/tts/azure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voice
    })
  });
  
  if (!response.ok) {
    throw new Error('Azure TTS failed');
  }
  
  const blob = await response.blob();
  const audioUrl = URL.createObjectURL(blob);
  
  return {
    audioUrl,
    provider: 'azure'
  };
}

/**
 * Pre-generate audio for all dialogues in a scenario
 */
export async function pregenerateScenarioAudio(
  scenarioId: string,
  language: 'es' | 'pt',
  provider: TTSProvider = 'openai'
): Promise<void> {
  try {
    await fetch('/api/conversation/pregenerate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario_id: scenarioId,
        language,
        provider
      })
    });
  } catch (error) {
    console.error('Failed to pregenerate audio:', error);
  }
}
