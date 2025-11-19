import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/speech/whisper
 * Transcribe audio using OpenAI Whisper
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const language = formData.get('language') as string;
    const prompt = formData.get('prompt') as string | null;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }
    
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: language || undefined,
      prompt: prompt || undefined
    });
    
    return NextResponse.json({
      text: transcription.text
    });
  } catch (error) {
    console.error('Error in Whisper transcription:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
