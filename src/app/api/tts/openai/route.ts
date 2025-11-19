import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/tts/openai
 * Generate speech using OpenAI TTS
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice = 'nova', speed = 1.0, model = 'tts-1' } = body;
    
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }
    
    const mp3Response = await openai.audio.speech.create({
      model,
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
      speed
    });
    
    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString()
      }
    });
  } catch (error) {
    console.error('Error in OpenAI TTS:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
